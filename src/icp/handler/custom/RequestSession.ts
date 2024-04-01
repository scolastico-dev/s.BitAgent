import { IcpCustomHandler, SBitAgentMessageType, SBitAgentMessage } from "src/icp/types/handler";
import { ResponseFailure, ResponseSession, RequestSession as RequestSessionMessage } from "src/icp/types/message";

export class RequestSession implements IcpCustomHandler {
  readonly messageType = SBitAgentMessageType.REQUEST_SESSION;
  async handle(message: RequestSessionMessage, prefix: string, agentService: any, client: any): Promise<SBitAgentMessage> {
    const session = await agentService.sessionService.getSession('IPC Request: ' + message.reason);
    return session
      ? new ResponseSession(session)
      : new ResponseFailure('Session request got rejected by the user');
  }
}
