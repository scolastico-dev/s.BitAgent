import { Global, Module } from '@nestjs/common';
import { LogService } from './log.service';
import { InquirerService } from './inquirer.service';
import { LicenseService } from './license.service';

const providers = [LogService, InquirerService, LicenseService];

@Global()
@Module({ providers, exports: providers })
export class SharedModule {}
