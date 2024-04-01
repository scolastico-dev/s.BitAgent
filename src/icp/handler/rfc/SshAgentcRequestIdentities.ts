import { AgentService } from "src/icp/agent.service";
import { IcpHandler, IcpMessageType } from "src/icp/types/handler";

import IPC from 'node-ipc';

import * as SshPK from 'sshpk';
import { KeyCacheEntry } from "src/shared/cache.service";

// https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#name-requesting-a-list-of-keys
export class SshAgentcRequestIdentities implements IcpHandler {
  readonly messageType = IcpMessageType.SSH_AGENTC_REQUEST_IDENTITIES;
  async handle(message: Buffer, prefix: string, agentService: AgentService, client: any): Promise<void> {
    agentService.logService.info(prefix + 'Received', 'SSH_AGENTC_REQUEST_IDENTITIES');

    const response = agentService.keyCacheService.getCache()?.map((item) => {
      const pub = SshPK.parseKey(item.key, 'auto');
      return { // Construct the response according to the protocol
        keyBlob: pub.toBuffer('rfc4253'),
        comment: item.comment,
      };
    }) || (await agentService.cacheService.getCache(null)) // If the cache is empty, we need to recompute the keys
      .map((item) => {
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
      .reduce((acc, cur) => { // Build the cache
        acc.items.push({
          key: cur.pub.toString('ssh'),
          comment: cur.item.name,
        });
        return acc;
      }, new class ChainItem { // Little trick, to stay in this chain format
        items: KeyCacheEntry[] = [];
        save(): KeyCacheEntry[] { // Save the items to the cache
          agentService.keyCacheService.setCache(this.items)
          return this.items
        }
      }())
      .save()
      .map((item) => {
        // Construct the response according to the protocol
        const pub = SshPK.parseKey(item.key, 'auto');
        return {
          keyBlob: pub.toBuffer('rfc4253'),
          comment: item.comment,
        };
      })

    const parts = [
      Buffer.from([IcpMessageType.SSH_AGENT_IDENTITIES_ANSWER]),
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

    agentService.logService.info(prefix + 'Sending', 'SSH_AGENT_IDENTITIES_ANSWER');
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(
      parts.reduce((acc, cur) => acc + cur.length, 0),
      0,
    );
    IPC.server.emit(client, Buffer.concat([sizeBuffer, ...parts]));
  }
}
