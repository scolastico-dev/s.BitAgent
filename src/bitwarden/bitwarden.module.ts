import { Global, Module } from '@nestjs/common';
import { BitwardenService } from './bitwarden.service';
import { SessionService } from './session.service';

const providers = [BitwardenService, SessionService];

@Global()
@Module({ providers, exports: providers })
export class BitwardenModule {}
