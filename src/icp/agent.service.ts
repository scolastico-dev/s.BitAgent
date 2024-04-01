import { Injectable } from '@nestjs/common';
import { LogService } from 'src/shared/log.service';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import { GuiService } from 'src/gui/gui.service';
import { SessionService } from 'src/bitwarden/session.service';
import { CacheService } from 'src/bitwarden/cache.service';
import { CacheService as KeyCacheService } from 'src/shared/cache.service';
import { IcpMessageType } from './types/handler';

import { IcpHandlers, IcpCustomHandlers } from './handler/index';

import IPC from 'node-ipc';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ResponseFailure, SBitAgentMessage } from './types/message';

@Injectable()
export class AgentService {
  readonly file =
    process.env.SSH_AUTH_SOCK || os.homedir() + '/.ssh/s-bit-agent.sock';
  socketId = 'agentService';
  client: any = null;
  running = false;
  timeout = 300_000;

  constructor(
    readonly logService: LogService,
    readonly bitService: BitwardenService,
    readonly guiService: GuiService,
    readonly sessionService: SessionService,
    readonly cacheService: CacheService,
    readonly keyCacheService: KeyCacheService,
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
    const prefix = `[event@${Math.random().toString(36).substring(7)}] `;
    const client = this.client;
    if (!Buffer.isBuffer(data)) {
      this.logService.error(prefix + 'Received non-buffer data:', data);
      return;
    } else if (data.length < 5) {
      this.logService.error(
        prefix + 'Received too short message:',
        data.toString('hex'),
      );
      return;
    }
    this.logService.info(prefix + 'Received message:', data.toString('hex'));
    const messageLength = data.readUInt32BE(0);
    const messageType = data.readInt8(4);
    let timouted = false;
    const timeoutT = setTimeout(() => {
      timouted = true;
      this.logService.error(prefix + 'Timeout while handling message:', messageType);
      this.logService.error(prefix + 'Message:', data.toString('hex'));
      IPC.server.emit(
        client,
        Buffer.from([0, 0, 0, 1, IcpMessageType.SSH_AGENT_FAILURE]),
      );
    }, this.timeout);
    try {
      let token: string | null = null;
      if (messageType == IcpMessageType.S_BIT_AGENT_EXCHANGE) {
        this.logService.info(prefix + 'Received', 'S_BIT_AGENT_EXCHANGE');
        const json = JSON.parse(data.toString('utf-8', 5, messageLength + 4));
        let response: SBitAgentMessage = new ResponseFailure('Unknown message');
        for (const handler of IcpCustomHandlers) {
          if (handler.messageType != json.type) continue;
          response = await handler.handle(json, prefix, this, client);
          this.logService.info(prefix + 'Handled', json.type);
          break;
        }
        const size = Buffer.alloc(4);
        const mType = Buffer.from([IcpMessageType.S_BIT_AGENT_EXCHANGE]);
        const responseBuffer = Buffer.from(JSON.stringify(response), 'utf-8');
        size.writeUInt32BE(responseBuffer.length + 1, 0);
        IPC.server.emit(
          client,
          Buffer.concat([size, mType, responseBuffer]),
        );
        this.logService.info(prefix + 'Sent', response.type);
        return;
      } else {
        for (const handler of IcpHandlers) {
          if (handler.messageType != messageType) continue;
          await handler.handle(data, prefix, this, client);
          this.logService.info(prefix + 'Handled', messageType);
          return;
        }
      }
      throw new Error('Unknown message type: ' + messageType);
    } catch (e) {
      this.logService.error(prefix + 'Error while handling message:', messageType);
      this.logService.error(prefix + 'Error message:', e.message);
      if (!IPC.config.silent) console.error(e);
      this.logService.info(prefix + 'Sending', 'SSH_AGENT_FAILURE');
      IPC.server.emit(
        client,
        Buffer.from([0, 0, 0, 1, IcpMessageType.SSH_AGENT_FAILURE]),
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
      IPC.server.on('socket.disconnected', () => {
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
}
