export enum SBitAgentMessageType {
  REQUEST_SESSION='REQUEST_SESSION',
  REQUEST_CACHE_CLEAR='REQUEST_CACHE_CLEAR',
  REQUEST_PING='REQUEST_PING',
  RESPONSE_SESSION='RESPONSE_SESSION',
  RESPONSE_OK='RESPONSE_OK',
  RESPONSE_FAILURE='RESPONSE_FAILURE',
}

export interface SBitAgentMessageBase {
  readonly type: SBitAgentMessageType;
}

export class RequestSession implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.REQUEST_SESSION;
  constructor(
    public readonly reason: string,
  ) {}
}

export class RequestCacheClear implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.REQUEST_CACHE_CLEAR;
}

export class RequestPing implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.REQUEST_PING;
}

export class ResponseSession implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.RESPONSE_SESSION;
  constructor(
    public readonly session: string,
  ) {}
}

export class ResponseOk implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.RESPONSE_OK;
}

export class ResponseFailure implements SBitAgentMessageBase {
  readonly type = SBitAgentMessageType.RESPONSE_FAILURE;
  constructor(
    public readonly reason: string,
  ) {}
}

export type SBitAgentMessage
  = RequestSession
  | RequestCacheClear
  | RequestPing
  | ResponseSession
  | ResponseOk
  | ResponseFailure;
