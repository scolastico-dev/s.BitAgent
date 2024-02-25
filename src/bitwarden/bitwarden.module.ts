import { Global, Module } from '@nestjs/common';
import { BitwardenService } from './bitwarden.service';
import { SessionService } from './session.service';
import { CacheService } from './cache.service';

const providers = [BitwardenService, SessionService, CacheService];

@Global()
@Module({ providers, exports: providers })
export class BitwardenModule {}
