import { Injectable } from '@nestjs/common';
import { LogService } from 'src/shared/log.service';
import { SessionService } from 'src/bitwarden/session.service';
import { AgentService } from './agent.service';

import { RequestSession, SBitAgentMessageType } from './types/message';
import { IcpMessageType, SBitAgentMessage } from './types/handler';

import IPC from 'node-ipc';

import * as fs from 'fs';

@Injectable()
export class ClientService {
  constructor(
    private readonly logService: LogService,
    private readonly sessionService: SessionService,
    private readonly agentService: AgentService,
  ) {}

  async requestSession(reason: string): Promise<string> {
    try {
      if (this.agentService.running || !fs.existsSync(this.agentService.file)) throw new Error();
      const res = await this.sendMessage(new RequestSession(reason));
      if (res.type !== SBitAgentMessageType.RESPONSE_SESSION) throw new Error();
    } catch (ignored) {}
    return this.sessionService.getSession(reason);
  }

  async sendMessage(message: SBitAgentMessage): Promise<SBitAgentMessage> {
    const size = Buffer.alloc(4);
    const type = Buffer.from([IcpMessageType.S_BIT_AGENT_EXCHANGE]);
    const data = Buffer.from(JSON.stringify(message));
    size.writeUInt32BE(type.length + data.length, 0);
    const buffer = Buffer.concat([size, type, data]);
    const clientId = `client-${Math.random().toString(36).substring(7)}`;
    let res: SBitAgentMessage;
    await new Promise((resolve, reject) => {
      IPC.connectTo(clientId, this.agentService.file, () => {
        IPC.of[clientId].on('connect', () => {
          this.logService.info('Connected to server');
          IPC.of[clientId].emit(buffer as any); // @types/node-ipc is wrong
          this.logService.info('Sent', message.type);
        });
        IPC.of[clientId].on('data', async (buf) => {
          const size = buf.readUInt32BE(0);
          if (size < 6) return reject('Invalid response size');
          const type = buf.readUInt8(4);
          if (type !== IcpMessageType.S_BIT_AGENT_EXCHANGE)
            return reject('Invalid response type');
          const data = buf.toString('utf-8', 5, size + 4);
          resolve(JSON.parse(data));
        });
      });
    }).then((data: SBitAgentMessage) => (res = data))
      .finally(() => IPC.disconnect(clientId));
    return res;
  }
}
