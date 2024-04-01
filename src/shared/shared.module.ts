import { Global, Module } from '@nestjs/common';
import { LogService } from './log.service';
import { InquirerService } from './inquirer.service';
import { LicenseService } from './license.service';
import { KeyService } from './key.service';
import { CacheService } from './cache.service';

const providers = [
  LogService,
  InquirerService,
  LicenseService,
  KeyService,
  CacheService,
];

@Global()
@Module({ providers, exports: providers })
export class SharedModule {}
