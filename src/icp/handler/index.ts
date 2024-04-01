import { IcpCustomHandler, IcpHandler } from "../types/handler"
import { RequestPing } from "./custom/RequestPing"
import { RequestCacheClear } from "./custom/RequestCacheClear"
import { RequestSession } from "./custom/RequestSession"
import { SshAgentcRequestIdentities } from "./rfc/SshAgentcRequestIdentities"
import { SshAgentcSignRequest } from "./rfc/SshAgentcSignRequest"

export const IcpCustomHandlers = [
  new RequestCacheClear(),
  new RequestSession(),
  new RequestPing(),
] as IcpCustomHandler[]

export const IcpHandlers = [
  new SshAgentcRequestIdentities(),
  new SshAgentcSignRequest(),
] as IcpHandler[]
