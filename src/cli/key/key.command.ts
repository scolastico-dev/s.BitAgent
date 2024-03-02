import { Command, CommandRunner } from 'nest-commander';
import { LogService } from 'src/shared/log.service';
import { NewCommand } from './new.command';
import { ImportCommand } from './import.command';

@Command({
  name: 'key',
  description: 'Manage SSH keys',
  subCommands: [NewCommand, ImportCommand],
})
export class KeyCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(): Promise<void> {
    this.logService.fatal('Please specify a subcommand');
  }
}
