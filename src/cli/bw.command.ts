import { Command, CommandRunner } from 'nest-commander';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';

@Command({
  name: 'bw',
  description: 'Bitwarden CLI Passthrough',
  arguments: '<options...>',
})
export class BwCommand extends CommandRunner {
  constructor(private readonly bitwardenService: BitwardenService) {
    super();
  }

  async run(params: string[]) {
    this.bitwardenService.run(null, ...params);
  }
}
