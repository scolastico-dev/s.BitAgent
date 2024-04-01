import { Global, Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ClientService } from './client.service';

const providers = [AgentService, ClientService];

@Global()
@Module({ providers, exports: providers })
export class ICPModule {}
