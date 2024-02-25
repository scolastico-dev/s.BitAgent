import { Injectable } from '@nestjs/common';
import { LogService } from 'src/shared/log.service';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import { GuiService } from 'src/gui/gui.service';
import { SessionService } from 'src/bitwarden/session.service';
import { CacheService } from 'src/bitwarden/cache.service';

import IPC from 'node-ipc';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as SshPK from 'sshpk';

export enum MessageType { // https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#section-5.1
  SSH_AGENTC_LOCK = 22,
  SSH_AGENTC_UNLOCK = 23,
  SSH_AGENTC_ADD_IDENTITY = 17,
  SSH_AGENTC_REMOVE_IDENTITY = 18,
  SSH_AGENTC_REMOVE_ALL_IDENTITIES = 19,
  SSH_AGENTC_REQUEST_IDENTITIES = 11,
  SSH_AGENTC_SIGN_REQUEST = 13,
  SSH_AGENT_FAILURE = 5,
  SSH_AGENT_IDENTITIES_ANSWER = 12,
  SSH_AGENT_SIGN_RESPONSE = 14,
  SSH_AGENT_SUCCESS = 6,
  S_BIT_AGENT_REQUEST_SESSION = 69, // Lets share a session with the cli agent
}

@Injectable()
export class AgentService {
  readonly file =
    process.env.SSH_AUTH_SOCK || os.homedir() + '/.ssh/s-bit-agent.sock';
  private socketId = 'agentService';
  private client: any = null;
  private running = false;
  private timeout = 300_000;

  constructor(
    private readonly logService: LogService,
    private readonly bitService: BitwardenService,
    private readonly guiService: GuiService,
    private readonly sessionService: SessionService,
    private readonly cacheService: CacheService,
  ) {
    IPC.config.id = this.socketId;
    IPC.config.retry = 1500;
    IPC.config.silent = true;
    IPC.config.rawBuffer = true;
    IPC.config.encoding = 'hex';
    IPC.config.writableAll = true;
    IPC.config.readableAll = true;
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
      process.on(signal, () => this.stop());
    });
  }

  private async handle(data: any): Promise<void> {
    if (!Buffer.isBuffer(data)) {
      this.logService.error('Received non-buffer data:', data);
      return;
    } else if (data.length < 5) {
      this.logService.error(
        'Received too short message:',
        data.toString('hex'),
      );
      return;
    }
    this.logService.info('Received message:', data.toString('hex'));
    const messageLength = data.readUInt32BE(0);
    const messageType = data.readInt8(4);
    let timouted = false;
    const timeoutT = setTimeout(() => {
      timouted = true;
      this.logService.error('Timeout while handling message:', messageType);
      this.logService.error('Message:', data.toString('hex'));
      IPC.server.emit(
        this.client,
        Buffer.from([0, 0, 0, 1, MessageType.SSH_AGENT_FAILURE]),
      );
    }, this.timeout);
    try {
      let token: string | null = null;
      switch (messageType) {
        case MessageType.SSH_AGENTC_REQUEST_IDENTITIES: // https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#name-requesting-a-list-of-keys
          this.logService.info('Received', 'SSH_AGENTC_REQUEST_IDENTITIES');
          token = await this.sessionService.getSession(null);
          if (timouted) return;
          if (!token) throw new Error('Session not approved');
          const items = await this.cacheService.getCacheWithToken(token);
          if (timouted) return;
          this.logService.info('Received', items.length, 'items');

          const response = items
            .map((item) => {
              const raw = item.fields.find(
                (field) => field.name === 'public-key',
              );
              if (
                !raw ||
                !item.fields.find((field) => field.name === 'private-key')
              ) {
                this.logService.error(
                  'Item',
                  item.name,
                  '@',
                  item.id,
                  'has no public and/or private key',
                );
                return null; // Skip, but signal this to the logger
              }
              const pub = SshPK.parseKey(raw.value, 'auto');
              // Construct the response according to the protocol
              return {
                keyBlob: pub.toBuffer('rfc4253'),
                comment: item.name,
              };
            })
            .filter((x) => x !== null); // Remove skipped items

          const parts = [
            Buffer.from([MessageType.SSH_AGENT_IDENTITIES_ANSWER]),
          ];

          // Number of keys
          const nkeysBuffer = Buffer.alloc(4);
          nkeysBuffer.writeUInt32BE(response.length, 0);
          parts.push(nkeysBuffer);

          // Append each keyBlob and comment
          response.forEach(({ keyBlob, comment }) => {
            const keyBlobLength = Buffer.alloc(4);
            keyBlobLength.writeUInt32BE(keyBlob.length, 0);
            parts.push(keyBlobLength);
            parts.push(keyBlob);

            const commentBuffer = Buffer.from(comment, 'utf-8');
            const commentLength = Buffer.alloc(4);
            commentLength.writeUInt32BE(commentBuffer.length, 0);
            parts.push(commentLength);
            parts.push(commentBuffer);
          });

          if (timouted) return;
          this.logService.info('Sending', 'SSH_AGENT_IDENTITIES_ANSWER');
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(
            parts.reduce((acc, cur) => acc + cur.length, 0),
            0,
          );
          if (timouted) return;
          IPC.server.emit(this.client, Buffer.concat([sizeBuffer, ...parts]));
          break;

        case MessageType.SSH_AGENTC_SIGN_REQUEST: // https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#name-private-key-operations
          this.logService.info('Received', 'SSH_AGENTC_SIGN_REQUEST');
          const keyBlobLength = data.readUInt32BE(5);
          const keyBlob = data.subarray(9, 9 + keyBlobLength);
          const dataLength = data.readUInt32BE(9 + keyBlobLength);
          const dataBuffer = data.subarray(
            13 + keyBlobLength,
            13 + keyBlobLength + dataLength,
          );
          const flags = data.readUInt32BE(13 + keyBlobLength + dataLength);

          token = await this.sessionService.getSession(null);
          if (timouted) return;
          if (!token) throw new Error('Session not approved');
          const item = (await this.cacheService.getCacheWithToken(token)).find((item) => {
            const raw = item.fields.find(
              (field) => field.name === 'public-key',
            );
            if (!raw) return false;
            const pub = SshPK.parseKey(raw.value, 'auto');
            return pub.toBuffer('rfc4253').equals(keyBlob);
          });
          if (!item) throw new Error('Key not found');

          const approval = await this.guiService.getInput(
            `SSH Agent: Sign request for "${item.name}", approve?`,
            'confirm',
          );
          if (timouted) return;
          if (approval !== 'true') throw new Error('Request denied');

          const priv = item.fields.find(
            (field) => field.name === 'private-key',
          );
          if (!priv) throw new Error('Private key not found');
          const key = SshPK.parsePrivateKey(priv.value, 'auto');
          const signature = key
            .createSign(
              flags === 4 ? 'sha512' : flags === 2 ? 'sha256' : 'sha1',
            )
            .update(dataBuffer)
            .sign();
          const signatureBuffer = (signature as any).toBuffer(
            [4, 2].includes(flags) ? 'ssh' : 'raw',
          );
          const signatureSize = Buffer.alloc(4);
          signatureSize.writeUInt32BE(signatureBuffer.length, 0);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(signatureBuffer.length + 5, 0);
          this.logService.info('Sending', 'SSH_AGENT_SIGN_RESPONSE');
          IPC.server.emit(
            this.client,
            Buffer.concat([
              size,
              Buffer.from([MessageType.SSH_AGENT_SIGN_RESPONSE]),
              signatureSize,
              signatureBuffer,
            ]),
          );
          break;

        case MessageType.S_BIT_AGENT_REQUEST_SESSION: // Off standard, but allows the CLI to request a session
          this.logService.info('Received', 'S_BIT_AGENT_REQUEST_SESSION');
          const reason = data.toString('utf-8', 5, messageLength + 4);
          const session = await this.sessionService.getSession(
            'IPC Request: ' + reason,
          );
          if (timouted) return;
          if (!session) {
            this.logService.error('Session request got rejected by the user');
            IPC.server.emit(
              this.client,
              Buffer.from([0, 0, 0, 1, MessageType.SSH_AGENT_FAILURE]),
            );
          } else {
            this.logService.info('Session request approved, sharing session');
            const size = Buffer.alloc(4);
            const sessionBuffer = Buffer.from(session, 'utf-8');
            size.writeUInt32BE(sessionBuffer.length, 0);
            IPC.server.emit(this.client, Buffer.concat([size, sessionBuffer]));
          }
          break;

        default:
          throw new Error('Unknown message type: ' + messageType);
          break;
      }
    } catch (e) {
      this.logService.error('Error while handling message:', messageType);
      this.logService.error('Error message:', e.message);
      if (!IPC.config.silent) console.error(e);
      this.logService.info('Sending', 'SSH_AGENT_FAILURE');
      IPC.server.emit(
        this.client,
        Buffer.from([0, 0, 0, 1, MessageType.SSH_AGENT_FAILURE]),
      );
    } finally {
      clearTimeout(timeoutT);
    }
  }

  setLogging(val: boolean) {
    if (IPC.server)
      throw new Error('Cannot change logging while server is running');
    IPC.config.silent = !val;
  }

  setTimeout(val: number) {
    if (IPC.server)
      throw new Error('Cannot change timeout while server is running');
    this.timeout = val;
  }

  async start() {
    if (this.running) return;
    this.running = true;

    if (fs.existsSync(this.file))
      this.logService.fatal('Socket file already exists:', this.file);

    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    IPC.serve(this.file, () => {
      IPC.server.on('data', (buffer) => {
        this.handle(buffer);
      });
      IPC.server.on('socket.disconnected', (socket) => {
        this.logService.info('Client disconnected');
      });
      IPC.server.on('connect', (socket) => {
        this.client = socket;
        this.logService.info('Client connected');
      });
      IPC.server.on('error', (err) => {
        if (err.message === 'read ECONNRESET') return;
        this.logService.error('IPC server error:', err.message);
      });
    });

    IPC.server.start();
    this.logService.info('IPC Server started on', this.file);
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    IPC.server.stop();
    this.logService.warn('IPC Server stopped');
  }

  async requestSession(reason: string): Promise<string> {
    if (this.running || !fs.existsSync(this.file))
      return this.sessionService.getSession(reason);
    this.logService.info('Requesting session');
    return await new Promise((resolve) => {
      IPC.connectTo('client', this.file, () => {
        IPC.of.client.on('connect', (socket) => {
          this.logService.info('Connected to server');
          const size = Buffer.alloc(4);
          const buff = Buffer.concat([
            Buffer.from([MessageType.S_BIT_AGENT_REQUEST_SESSION]),
            Buffer.from(reason, 'utf-8'),
          ]);
          size.writeUInt32BE(buff.length, 0);
          IPC.of.client.emit(Buffer.concat([size, buff]) as any); // @types/node-ipc is wrong
          this.logService.info('Sent', 'S_BIT_AGENT_REQUEST_SESSION');
        });
        IPC.of.client.on('data', async (buffer) => {
          IPC.disconnect('client');
          const size = buffer.readUInt32BE(0);
          if (size > 1) {
            this.logService.info('Received session');
            resolve(buffer.toString('utf-8', 4, size + 4));
          } else {
            this.logService.error(
              'Session request rejected, creating own session',
            );
            const session = await this.sessionService.getSession(reason);
            if (!session)
              this.logService.fatal(
                'Session request got rejected. Please try again.',
              );
            resolve(session);
          }
        });
      });
    });
  }
}
