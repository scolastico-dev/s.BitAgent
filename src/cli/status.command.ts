import {
  Command,
  CommandRunner,
  Option,
  OptionChoiceFor,
} from 'nest-commander';
import { LogService } from 'src/shared/log.service';
import * as Colors from 'colors';
import { AgentService } from 'src/key/agent.service';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

@Command({
  name: 'status',
  description: 'Get the current status of s.BitAgent',
})
export class StatusCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly agentService: AgentService,
  ) {
    super();
  }

  async run(params: string[], options: Record<string, any>) {
    this.logService.info(`s.BitAgent - Version: IN-DEV`);
    this.logService.info('Copyright 2024 - Joschua Becker EDV');
    this.logService.log('-----------------------------------');
    const status = [
      { name: 'Description', status: 'Status' },
      { name: 'Daemon Service', status: existsSync(this.agentService.file) },
    ] as { name: string; status: boolean | string }[];
    for (const service of status) {
      const name = service.name.padEnd(20, ' ');
      const color = service.status ? Colors.green : Colors.red;
      this.logService.raw(
        name,
        typeof service.status === 'string'
          ? service.status
          : color(service.status ? 'Yes' : 'No'),
      );
    }
    this.logService.log('-----------------------------------');
    this.logService.log('modulus signature name (type)');
    spawnSync('ssh-add', ['-l'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SSH_AUTH_SOCK: this.agentService.file,
      },
    });
  }
}
