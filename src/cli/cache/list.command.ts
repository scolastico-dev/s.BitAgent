import { Command, CommandRunner } from 'nest-commander';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'list',
  description: 'List all cache entries',
  arguments: '<file>',
})
export class ListCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(): Promise<void> {
  }
}
