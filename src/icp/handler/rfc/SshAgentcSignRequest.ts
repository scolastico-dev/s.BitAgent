import { AgentService } from "src/icp/agent.service";
import { IcpHandler, IcpMessageType } from "src/icp/types/handler";

import IPC from 'node-ipc';

import * as SshPK from 'sshpk';

// https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#name-private-key-operations
export class SshAgentcSignRequest implements IcpHandler {
  readonly messageType = IcpMessageType.SSH_AGENTC_SIGN_REQUEST;
  async handle(message: Buffer, prefix: string, agentService: AgentService, client: any): Promise<void> {
    agentService.logService.info(prefix + 'Received', 'SSH_AGENTC_SIGN_REQUEST');
    const keyBlobLength = message.readUInt32BE(5);
    const keyBlob = message.subarray(9, 9 + keyBlobLength);
    const dataLength = message.readUInt32BE(9 + keyBlobLength);
    const dataBuffer = message.subarray(13 + keyBlobLength, 13 + keyBlobLength + dataLength);
    const flags = message.readUInt32BE(13 + keyBlobLength + dataLength);

    const token = await agentService.sessionService.getSession(null);
    if (!token) throw new Error('Session not approved');
    const items = await agentService.cacheService.getCacheWithToken(token);

    agentService.keyCacheService.setCache(items.map((item) => {
      const raw = item.fields.find(
        (field) => field.name === 'public-key',
      );
      if (
        !raw ||
        !item.fields.find((field) => field.name === 'private-key')
      ) {
        agentService.logService.error(
          'Item',
          item.name,
          '@',
          item.id,
          'has no public and/or private key',
        );
        return null; // Skip, but signal this to the logger
      }
      const pub = SshPK.parseKey(raw.value, 'auto');
      return { item, pub };
    })
    .filter((x) => x !== null) // Remove skipped items
    .map((x) => ({
      key: x.pub.toString('ssh'),
      comment: x.item.name,
    })))


    const item = items.find(
      (item) => {
        const raw = item.fields.find(
          (field) => field.name === 'public-key',
        );
        if (!raw) return false;
        const pub = SshPK.parseKey(raw.value, 'auto');
        return pub.toBuffer('rfc4253').equals(keyBlob);
      },
    );
    if (!item) throw new Error('Key not found');

    const approval = await agentService.guiService.getInput(
      `SSH Agent: Sign request for "${item.name}", approve?`,
      'confirm',
    );
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
    agentService.logService.info(prefix + 'Sending', 'SSH_AGENT_SIGN_RESPONSE');
    IPC.server.emit(
      client,
      Buffer.concat([
        size,
        Buffer.from([IcpMessageType.SSH_AGENT_SIGN_RESPONSE]),
        signatureSize,
        signatureBuffer,
      ]),
    );
  }
}
