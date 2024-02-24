import { Command, CommandRunner } from 'nest-commander';
import { existsSync, readFileSync } from 'fs';
import { LogService } from 'src/shared/log.service';
import { KeyService } from 'src/key/key.service';
import { InquirerService } from 'src/shared/inquirer.service';
import { BitwardenService } from 'src/bitwarden/bitwarden.service';
import {
  BitwardenItemType,
  BitwardenKeyCreateItem,
  BitwardenKeyItem,
} from 'src/bitwarden/bitwarden.type';

@Command({
  name: 'import',
  arguments: '<file> <name>',
  description: 'Import a private key into the vault',
})
export class ImportCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly keyService: KeyService,
    private readonly inquirerService: InquirerService,
    private readonly bitService: BitwardenService,
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
    const password = await this.inquirerService.password(
      'Please enter your Bitwarden master password:',
    );
    const token = this.bitService.unlock(password);
    this.logService.info('Unlocked the vault...');
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
    this.bitService.create(data, token);
    this.logService.info('Created new item in the vault...');
    this.bitService.lock(token);
    this.logService.info('Locked the vault...');
    this.logService.info('Created new private key in the vault!');
  }
}
