import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as fs from 'fs';
import * as child_process from 'child_process';

@Injectable()
export class SystemdAutostartService implements AutostartService {
  name = 'Systemd Autostart (User)';

  async canActivate(): Promise<boolean> {
    try {
      // Check for Unix-like OS (systemd is primarily used on these)
      if (process.platform !== 'linux' && process.platform !== 'darwin') {
        return false;
      }

      // Check if systemd --user instance exists
      const result = child_process.spawnSync('systemctl', ['--user', 'status']);
      return result.status === 0;
    } catch (error) {
      console.error('Error checking systemd availability:', error);
      return false;
    }
  }

  async install(
    command: string,
    name: string,
    marker: string,
  ): Promise<boolean> {
    try {
      const homeDir = process.env.HOME;
      if (!homeDir) {
        throw new Error('Could not determine user home directory');
      }

      const serviceFilePath = `${homeDir}/.config/systemd/user/${name}-${marker}.service`; // Marker change
      const serviceContent = this.generateServiceFileContent(command, marker);

      fs.writeFileSync(serviceFilePath, serviceContent);
      child_process.execSync(
        `systemctl --user enable ${name}-${marker}.service`,
      ); // Marker change
      child_process.execSync(`systemctl --user daemon-reload`);
      child_process.execSync(
        `systemctl --user start ${name}-${marker}.service`,
      ); // Marker change

      return true;
    } catch (error) {
      console.error('Error installing autostart:', error);
      return false;
    }
  }

  async uninstall(marker: string): Promise<boolean> {
    try {
      // Find the service file based on the marker
      const serviceFiles = fs.readdirSync(
        `${process.env.HOME}/.config/systemd/user`,
      );
      const serviceFile = serviceFiles.find((file) =>
        file.includes(`${marker}.service`),
      ); // Marker change

      if (serviceFile) {
        child_process.execSync(`systemctl --user stop ${serviceFile}`);
        child_process.execSync(`systemctl --user disable ${serviceFile}`);
        fs.unlinkSync(
          `${process.env.HOME}/.config/systemd/user/${serviceFile}`,
        );
        child_process.execSync(`systemctl --user daemon-reload`);
      }

      return true;
    } catch (error) {
      console.error('Error uninstalling autostart:', error);
      return false;
    }
  }

  async isInstalled(marker: string): Promise<boolean> {
    try {
      const serviceFiles = fs.readdirSync(
        `${process.env.HOME}/.config/systemd/user`,
      );
      return serviceFiles.some((file) => file.includes(`${marker}.service`)); // Marker change
    } catch (error) {
      console.error('Error checking if autostart is installed:', error);
      return false;
    }
  }

  private generateServiceFileContent(command: string, marker: string): string {
    return `[Unit]
Description=Autostart entry for ${marker}

[Service]
ExecStart=${command}

[Install]
WantedBy=default.target
`;
  }
}
