import { AgentService } from "../agent.service";
import { SBitAgentMessageType, SBitAgentMessage } from "./message";

export { SBitAgentMessageType, SBitAgentMessage };

export enum IcpMessageType {
  // https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent#section-5.1
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
  // Off standard, see message.ts
  S_BIT_AGENT_EXCHANGE = 69,
}

export interface IcpHandler {
  readonly messageType: IcpMessageType;
  handle(message: Buffer, prefix: string, agentService: AgentService, client: any): Promise<void>;
}

export interface IcpCustomHandler {
  readonly messageType: SBitAgentMessageType;
  handle(message: SBitAgentMessage, prefix: string, agentService: AgentService, client: any): Promise<SBitAgentMessage>;
}
