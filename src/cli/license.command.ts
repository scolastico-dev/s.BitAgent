import { Command, CommandRunner, Option } from 'nest-commander';
import { LicenseService } from 'src/shared/license.service';

@Command({
  name: 'license',
  description: 'Get license information about this software',
})
export class LicenseCommand extends CommandRunner {
  constructor(private readonly licenseService: LicenseService) {
    super();
  }

  @Option({
    name: 'full',
    flags: '-f, --full',
    description: 'Show the full license text',
  })
  parseFull() {
    return true;
  }

  async run(params: string[], options: Record<string, any>) {
    console.log(
      this.licenseService[
        options.full ? 'getLicenseContent' : 'getLicenseDescription'
      ](),
    );
  }
}
