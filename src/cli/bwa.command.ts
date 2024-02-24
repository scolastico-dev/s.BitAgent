import { Command, CommandRunner } from 'nest-commander';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import { AgentService } from 'src/key/agent.service';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'bwa',
  description:
    'Bitwarden Authenticated CLI Passthrough. Use the internal auth session to allow the Bitwarden CLI to access your vault.',
  arguments: '<options...>',
})
export class BwaCommand extends CommandRunner {
  constructor(
    private readonly bitwardenService: BitwardenService,
    private readonly agentService: AgentService,
    private readonly logService: LogService,
  ) {
    super();
  }

  async run(params: string[]) {
    const session = await this.agentService.requestSession(
      'Bitwarden CLI Passthrough',
    );
    if (!session)
      this.logService.fatal('Session request got rejected. Please try again.');
    this.bitwardenService.enableLogging();
    this.bitwardenService.run(session, ...params);
  }
}
