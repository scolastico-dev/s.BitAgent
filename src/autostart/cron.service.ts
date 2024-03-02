import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as child_process from 'child_process';

@Injectable()
export class CronAutostartService implements AutostartService {
  name = 'Cron Autostart';

  async canActivate(): Promise<boolean> {
    return child_process.spawnSync('which', ['crontab']).status === 0;
  }

  async install(
    command: string,
    name: string,
    marker: string,
  ): Promise<boolean> {
    try {
      // Get existing crontab
      const currentCrontab = child_process.execSync('crontab -l').toString();

      // Check if entry already exists (avoid duplicates)
      if (currentCrontab.includes(marker)) {
        console.warn('Autostart entry already exists in crontab');
        return false;
      }

      // Append the new entry with the marker
      const newCrontab =
        currentCrontab + `@reboot ${command} > /dev/null 2>&1 # ${marker}\n`;
      child_process.execSync(`echo "${newCrontab}" | crontab -`);

      return true;
    } catch (error) {
      console.error('Error installing cron autostart:', error);
      return false;
    }
  }

  async uninstall(marker: string): Promise<boolean> {
    try {
      const currentCrontab = child_process.execSync('crontab -l').toString();

      // Remove lines containing the marker
      const newCrontab = currentCrontab
        .split('\n')
        .filter((line) => !line.includes(marker))
        .join('\n');

      child_process.execSync(`echo "${newCrontab}" | crontab -`);

      return true;
    } catch (error) {
      console.error('Error uninstalling cron autostart:', error);
      return false;
    }
  }

  async isInstalled(marker: string): Promise<boolean> {
    try {
      const currentCrontab = child_process.execSync('crontab -l').toString();
      return currentCrontab.includes(marker);
    } catch (error) {
      console.error('Error checking if cron autostart is installed:', error);
      return false;
    }
  }
}
