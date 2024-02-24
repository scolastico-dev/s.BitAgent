import { Command, CommandRunner } from 'nest-commander';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'uninstall',
  description: 'Remove autostart and other system integrations',
})
export class UninstallCommand extends CommandRunner {
  constructor(private readonly logService: LogService) {
    super();
  }

  async run(params: string[], options: Record<string, any>) {
    this.logService.error('Not implemented yet!');
  }
}
