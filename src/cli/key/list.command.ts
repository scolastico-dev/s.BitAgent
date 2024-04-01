import { SubCommand, CommandRunner } from 'nest-commander';
import { existsSync, readFileSync } from 'fs';
import { LogService } from 'src/shared/log.service';
import { KeyService } from 'src/shared/key.service';
import { InquirerService } from 'src/shared/inquirer.service';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import { ClientService } from 'src/icp/client.service';
import {
  BitwardenItemType,
  BitwardenKeyCreateItem,
} from 'src/bitwarden/bitwarden.type';

@SubCommand({
  name: 'list',
  description: 'List all available keys',
})
export class ImportCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly keyService: KeyService,
    private readonly inquirerService: InquirerService,
    private readonly bitService: BitwardenService,
    private readonly clientService: ClientService,
  ) {
    super();
  }

  async run(params: string[]) {
    const path = params[0];
    if (!existsSync(path)) this.logService.fatal(`File not found: ${path}`);
    let privateKey = readFileSync(path, 'utf8');
    let publicKey = '';
    try {
      publicKey = this.keyService.generatePublicKey(privateKey, params[1]);
    } catch (ignored) {
      this.logService.warn(
        'Error while generating public key, assuming private key is password protected',
      );
      const password = await this.inquirerService.password(
        'Enter the password for the key',
      );
      privateKey = this.keyService.decryptPrivateKey(privateKey, password);
      publicKey = this.keyService.generatePublicKey(privateKey, params[1]);
    }
    this.logService.info('Read private key:', '***');
    this.logService.info('Read public key:', publicKey);
    const session = await this.clientService.requestSession(
      'Importing new private key',
    );
    if (!session) this.logService.fatal('No session available');
    const data = new BitwardenKeyCreateItem();
    data.name = params[1];
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
    this.logService.info('Created new private key in the vault!');
  }
}
