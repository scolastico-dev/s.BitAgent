import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as fs from 'fs';
import * as child_process from 'child_process';

// Does also install a SystemD Service, but with a dedicated user
// As nearly every UNIX system does not allow memory access to other users, this is a more secure approach
@Injectable()
export class SecureSystemdAutostartService implements AutostartService {
  name = 'Systemd Autostart (Secure-User)';

  async canActivate(): Promise<boolean> {
    try {
      // Check for Unix-like OS (systemd is primarily used on these)
      if (process.platform !== 'linux' && process.platform !== 'darwin') {
        return false;
      }

      // Check if systemd is available
      if (child_process.spawnSync('which', ['systemctl']).status !== 0) {
        return false;
      }

      // Check for 'sudo' and 'adduser' availability
      if (child_process.spawnSync('which', ['sudo']).status !== 0 ||
          child_process.spawnSync('which', ['adduser']).status !== 0) {
        return false;
      }

      // Check if systemd --user instance exists
      const result = child_process.spawnSync('systemctl', ['--user', 'status']);
      return result.status === 0;
    } catch (error) {
      console.error('Error checking prerequisites:', error);
      return false;
    }
  }

  async install(command: string, name: string, marker: string): Promise<boolean> {
    try {
      // Use the marker as the daemon user name
      const daemonUserName = marker;

      this.ensureDaemonUser(daemonUserName);
  
      const serviceName = `${name}-${marker}.service`;
      const serviceFilePath = `/etc/systemd/system/${serviceName}`;
  
      // Generate the new service content
      const newServiceContent = this.generateServiceFileContent(command, name, marker, daemonUserName);
  
      // Check if the service file already exists and if it needs updating
      if (fs.existsSync(serviceFilePath)) {
        const existingServiceContent = fs.readFileSync(serviceFilePath, 'utf8');
        if (existingServiceContent === newServiceContent) {
          console.log('Service file is up to date. No changes required.');
          return true; // No update needed
        }
      }
  
      // Write the new or updated service file content
      fs.writeFileSync(serviceFilePath, newServiceContent);
  
      // Reload the systemd manager configuration
      this.execWithSudo('systemctl daemon-reload'); 

      // Enable and restart the service to apply changes
      this.execWithSudo(`systemctl enable ${serviceName}`);
      this.execWithSudo(`systemctl restart ${serviceName}`);
  
      return true;
    } catch (error) {
      console.error('Error installing or updating autostart:', error);
      return false;
    }
  }

  async uninstall(marker: string): Promise<boolean> {
    try {
      // Find the service file based on the marker
      const serviceFiles = fs.readdirSync('/etc/systemd/system');
      const serviceFile = serviceFiles.find((file) => file.includes(`${marker}.service`));

      if (serviceFile) {
        this.execWithSudo(`systemctl stop ${serviceFile}`);
        this.execWithSudo(`systemctl disable ${serviceFile}`);
        fs.unlinkSync(`/etc/systemd/system/${serviceFile}`);
        this.execWithSudo(`systemctl daemon-reload`);
      }

      return true;
    } catch (error) {
      console.error('Error uninstalling autostart:', error);
      return false;
    }
  }

  async isInstalled(marker: string): Promise<boolean> {
    try {
      const serviceFiles = fs.readdirSync('/etc/systemd/system');
      return serviceFiles.some((file) => file.includes(`${marker}.service`));
    } catch (error) {
      console.error('Error checking if autostart is installed:', error);
      return false;
    }
  }

  private ensureDaemonUser(daemonUserName: string): void {
    // Check if the user already exists
    if (child_process.spawnSync('id', ['-u', daemonUserName]).status !== 0) {
      // Create the user without a home directory and without login capabilities
      this.execWithSudo(`adduser --system --no-create-home --shell /usr/sbin/nologin ${daemonUserName}`);
    }
  }

  private generateServiceFileContent(command: string, name: string, marker: string, daemonUserName: string): string {
    return `[Unit]
Description=Autostart entry for ${marker}

[Service]
ExecStart=${command}
User=${daemonUserName}

[Install]
WantedBy=multi-user.target
`;
  }

  private execWithSudo(command: string) {
    child_process.execSync(`sudo ${command}`, { stdio: 'inherit' });
  }
}