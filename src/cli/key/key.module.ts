import { Module } from '@nestjs/common';
import { ImportCommand } from './import.command';
import { NewCommand } from './new.command';
import { KeyCommand } from './key.command';

@Module({
  providers: [ImportCommand, NewCommand, KeyCommand],
})
export class KeyModule {}
