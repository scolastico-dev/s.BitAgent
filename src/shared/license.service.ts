import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { LogService } from './log.service';

@Injectable()
export class LicenseService {
  static readonly EXECTED_LICENSE_HASH =
    '3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986';
  private file: string;

  constructor(private readonly logService: LogService) {
    this.file = path.join(__filename, '..', '..', '..', 'LICENSE');
  }

  /**
   * Returns the license file. This function will not check the integrity of the file.
   * @returns The license file as a string.
   */
  getLicenseFile(): string {
    return this.file;
  }

  /**
   * Retrieves the content of the license file.
   * @returns The content of the license file as a string.
   */
  getLicenseContent(): string {
    const license = fs.readFileSync(this.file, 'utf8');
    const hash = crypto.createHash('sha256').update(license).digest('hex');
    if (hash !== LicenseService.EXECTED_LICENSE_HASH) {
      this.logService.fatal('License file has been tampered with');
    }
    return license;
  }

  /**
   * Retrieves a human-readable description of the license.
   * @returns The license description as a string.
   */
  getLicenseDescription(): string {
    return [
      'GNU General Public License v3.0',
      'GNU GPLv3\n',
      'Permissions of this strong copyleft license are conditioned on making',
      'available complete source code of licensed works and modifications,',
      'which include larger works using a licensed work, under the same license.',
      'Copyright and license notices must be preserved. Contributors provide',
      'an express grant of patent rights.\n',
      'What you can do:',
      ' - Commercial use',
      ' - Distribution',
      ' - Modification',
      ' - Patent use',
      ' - Private use\n',
      'What you must do:',
      ' - Disclose source',
      ' - License and copyright notice',
      ' - Same license',
      ' - State changes\n',
      'What you cannot do:',
      ' - Hold liable',
      ' - Use trademark\n',
      'Information provided by choosealicense.com',
      'This is not legal advice. See LICENSE file for exact terms.',
    ].join('\n');
  }
}
