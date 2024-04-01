import { Command, CommandRunner } from 'nest-commander';
import { LogService } from 'src/shared/log.service';
import { ListCommand } from './list.command';
import { ClearCommand } from './clear.command';

@Command({
  name: 'cache',
  description: 'Manage the cache',
  subCommands: [ListCommand, ClearCommand],
})
export class CacheCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(): Promise<void> {
    this.logService.fatal('Please specify a subcommand');
  }
}
