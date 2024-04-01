import { IcpCustomHandler, SBitAgentMessageType, SBitAgentMessage } from "src/icp/types/handler";
import { ResponseOk } from "src/icp/types/message";

export class RequestPing implements IcpCustomHandler {
  readonly messageType = SBitAgentMessageType.REQUEST_PING;
  async handle(): Promise<SBitAgentMessage> {
    return new ResponseOk();
  }
}
