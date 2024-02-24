import { Module } from '@nestjs/common';
import { BwCommand } from './bw.command';
import { BwaCommand } from './bwa.command';
import { DaemonCommand } from './daemon.command';
import { ImportCommand } from './import.command';
import { NewCommand } from './new.command';
import { StatusCommand } from './status.command';
import { SetupCommand } from './setup.command';
import { UninstallCommand } from './uninstall.command';

@Module({
  providers: [
    BwCommand,
    BwaCommand,
    DaemonCommand,
    ImportCommand,
    NewCommand,
    StatusCommand,
    SetupCommand,
    UninstallCommand,
  ],
})
export class CliModule {}
