import {
  Command,
  CommandRunner,
  Option,
  OptionChoiceFor,
} from 'nest-commander';
import { LogService } from 'src/shared/log.service';
import { KeyService, SUPPORTED_MODULI } from 'src/key/key.service';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import { AgentService } from 'src/key/agent.service';
import {
  BitwardenItemType,
  BitwardenKeyCreateItem,
} from 'src/bitwarden/bitwarden.type';

@Command({
  name: 'new',
  arguments: '<name>',
  description: 'Generate a new key pair and import it into the vault',
})
export class NewCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly keyService: KeyService,
    private readonly bitService: BitwardenService,
    private readonly agentService: AgentService,
  ) {
    super();
  }

  @Option({
    name: 'modulus',
    flags: '-m, --modulus <modolus>',
    description: 'ModUlus for the key pair',
    defaultValue: '3072',
    choices: Object.keys(SUPPORTED_MODULI).filter(
      (x) => typeof SUPPORTED_MODULI[x] === 'string',
    ),
    required: true,
  })
  parseModulus(modulus: string) {
    return modulus;
  }

  @OptionChoiceFor({ name: 'modulus' })
  getModulusChoices() {
    return Object.keys(SUPPORTED_MODULI).filter(
      (x) => typeof SUPPORTED_MODULI[x] === 'string',
    );
  }

  async run(params: string[], options: Record<string, any>) {
    if (
      !Object.keys(SUPPORTED_MODULI)
        .filter((x) => typeof SUPPORTED_MODULI[x] === 'string')
        .includes(options.modulus)
    )
      this.logService.fatal('Invalid modulus');
    const privateKey = this.keyService.generateRSAKey(Number(options.modulus));
    this.logService.info('Generated private key:', '***');
    const publicKey = this.keyService.generatePublicKey(privateKey, params[0]);
    this.logService.info('Generated public key:', publicKey);
    const session = await this.agentService.requestSession('Generate new private key');
    if (!session) this.logService.fatal('No session available');
    const data = new BitwardenKeyCreateItem();
    data.name = params[0];
    data.notes = publicKey;
    data.secureNote = privateKey;
    data.fields = [
      { name: 'custom-type', value: 'ssh-key', type: BitwardenItemType.STRING },
      { name: 'public-key', value: publicKey, type: BitwardenItemType.STRING },
      {
        name: 'private-key',
        value: privateKey,
        type: BitwardenItemType.PASSWORD,
      },
    ];
    this.bitService.create(data, session);
    this.logService.info('Imported private key into the vault!');
  }
}
