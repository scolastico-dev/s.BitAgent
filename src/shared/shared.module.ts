import { Global, Module } from '@nestjs/common';
import { LogService } from './log.service';
import { InquirerService } from './inquirer.service';

const providers = [LogService, InquirerService];

@Global()
@Module({ providers, exports: providers })
export class SharedModule {}
