import { Command, CommandRunner } from 'nest-commander';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'clear',
  description: 'Clear the cache, the next time the cache is accessed it will be rebuilt.',
  arguments: '<file>',
})
export class ClearCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(): Promise<void> {
  }
}
