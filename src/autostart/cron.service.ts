import { Injectable } from '@nestjs/common';
import * as child_process from 'child_process';
import { AutostartService } from './autostart.interface';

@Injectable()
export class CronAutostartService implements AutostartService {
  name = 'Cron';
  readonly COMMAND_MARKER = 's-bit-agent';

  canActivate(): boolean {
    try {
      child_process.execSync('crontab -l');
      return true;
    } catch (error) {
      return false;
    }
  }

  async install(command: string): Promise<boolean> {
    try {
      const modifiedCommand = `${command} # ${this.COMMAND_MARKER}`;
      child_process.execSync(
        `(crontab -l; echo "@reboot ${modifiedCommand}") | crontab -`,
      );
      return true;
    } catch (error) {
      console.error('Cron install error:', error);
      return false;
    }
  }

  async uninstall(): Promise<boolean> {
    try {
      let crontabContents = child_process.execSync('crontab -l').toString();
      crontabContents = crontabContents
        .split('\n')
        .filter((line) => !line.includes(this.COMMAND_MARKER))
        .join('\n');
      child_process.execSync(`echo "${crontabContents}" | crontab -`);
      return true;
    } catch (error) {
      console.error('Cron uninstall error:', error);
      return false;
    }
  }
}
