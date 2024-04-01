import { IcpCustomHandler, SBitAgentMessageType, SBitAgentMessage } from "src/icp/types/handler";

export class RequestCacheClear implements IcpCustomHandler {
  readonly messageType = SBitAgentMessageType.REQUEST_CACHE_CLEAR;
  async handle(message: SBitAgentMessage, prefix: string, agentService: any, client: any): Promise<SBitAgentMessage> {
    throw new Error("Method not implemented.");
  }
}
