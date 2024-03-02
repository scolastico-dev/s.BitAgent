import { Module } from '@nestjs/common';

import { KeyModule } from './key/key.module';

import { BwCommand } from './bw.command';
import { BwaCommand } from './bwa.command';
import { DaemonCommand } from './daemon.command';
import { StatusCommand } from './status.command';
import { SetupCommand } from './setup.command';
import { LicenseCommand } from './license.command';

@Module({
  imports: [KeyModule],
  providers: [
    BwCommand,
    BwaCommand,
    DaemonCommand,
    LicenseCommand,
    StatusCommand,
    SetupCommand,
  ],
})
export class CliModule {}
