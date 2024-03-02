import { Command, CommandRunner, Option } from 'nest-commander';
import { AutostartService } from 'src/autostart/autostart.service';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'setup',
  description:
    'Install the daemon service to run in the background on system startup.',
})
export class SetupCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly autostartService: AutostartService,
  ) {
    super();
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'The type of autostart service to use.',
  })
  async parseType(value: string) {
    return value;
  }

  @Option({
    flags: '-u, --uninstall',
    description: 'Uninstall the daemon service.',
  })
  async parseUninstall() {
    return true;
  }

  @Option({
    flags: '--args <args>',
    description: 'Additional arguments to pass to the daemon service.',
  })
  async parseArgs(value: string) {
    return value;
  }

  async run(params: string[], options: Record<string, any>) {
    const available = await this.autostartService.getAvailableServices();

    if (available.length === 0)
      this.logService.fatal(
        [
          'Your system does not support any autostart services,',
          'you will need to manually register a autostart for the daemon command',
        ].join(' '),
      );

    if (!options.type) {
      this.logService.log('Available services:');
      for (const service of available) {
        this.logService.log(`- ${service.name}: ${service.constructor.name}`);
      }
      this.logService.fatal('Please specify a service type');
    }

    const option = available.find((x) => x.constructor.name === options.type);
    if (!option) {
      this.logService.fatal('Invalid service type');
    }

    if (options.uninstall) {
      await this.autostartService.uninstall(option);
      this.logService.log('Service uninstalled');
      return process.exit(0);
    }

    const executable = process.argv[1];
    const command = `${executable} daemon ${options.args}`;
    await this.autostartService.install(command, option);

    this.logService.log('Service installed');
  }
}
