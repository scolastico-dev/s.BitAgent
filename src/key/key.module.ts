import { Global, Module } from '@nestjs/common';
import { KeyService } from './key.service';
import { AgentService } from './agent.service';

const providers = [KeyService, AgentService];

@Global()
@Module({ providers, exports: providers })
export class KeyModule {}
