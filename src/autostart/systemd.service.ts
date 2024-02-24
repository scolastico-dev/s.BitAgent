import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';

@Injectable()
export class SystemdAutostartService implements AutostartService {
  name = 'systemd';
  readonly COMMAND_MARKER = 's-bit-agent';

  canActivate(): boolean {
    try {
      // Check for systemd user instance
      child_process.execSync('systemctl --user --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  async install(command: string): Promise<boolean> {
    const homeDir = os.homedir();
    const serviceUnitPath = `${homeDir}/.config/systemd/user/${this.COMMAND_MARKER}.service`;

    const serviceUnit = `
        [Unit]
        Description=s.BitAgent Autostart

        [Service]
        ExecStart=${command} 

        [Install]
        WantedBy=default.target 
        `;

    try {
      fs.writeFileSync(serviceUnitPath, serviceUnit);
      child_process.execSync('systemctl --user daemon-reload');
      child_process.execSync(
        `systemctl --user enable ${this.COMMAND_MARKER}.service`,
      );
      return true;
    } catch (error) {
      console.error('Installation error:', error);
      return false;
    }
  }

  async uninstall(): Promise<boolean> {
    try {
      child_process.execSync(
        `systemctl --user disable ${this.COMMAND_MARKER}.service`,
      );

      const homeDir = os.homedir();
      const serviceUnitPath = `${homeDir}/.config/systemd/user/${this.COMMAND_MARKER}.service`;
      fs.unlinkSync(serviceUnitPath);

      child_process.execSync('systemctl --user daemon-reload');
      return true;
    } catch (error) {
      console.error('Uninstall error:', error);
      return false;
    }
  }
}
