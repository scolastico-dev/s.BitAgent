import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as plist from 'plist';

@Injectable()
export class LaunchAgentAutostartService implements AutostartService {
  name = 'Launch Agent Autostart (macOS)';

  async canActivate(): Promise<boolean> {
    return process.platform === 'darwin'; // macOS
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

      const agentFilePath = `${homeDir}/Library/LaunchAgents/${name}-${marker}.plist`;

      // Create the basic .plist structure
      const plistContent = plist.build({
        Label: `${name}-${marker}`,
        ProgramArguments: ['sh', '-c', command],
        RunAtLoad: true, // Run on login
      });

      fs.writeFileSync(agentFilePath, plistContent);

      // Load the Launch Agent
      child_process.execSync(`launchctl load -w ${agentFilePath}`);

      return true;
    } catch (error) {
      console.error('Error installing Launch Agent autostart:', error);
      return false;
    }
  }

  async uninstall(marker: string): Promise<boolean> {
    try {
      const homeDir = process.env.HOME;
      if (!homeDir) {
        throw new Error('Could not determine user home directory');
      }

      const agentFilePath = `${homeDir}/Library/LaunchAgents/${name}-${marker}.plist`;

      // First unload if loaded
      child_process.execSync(`launchctl unload -w ${agentFilePath}`);

      fs.unlinkSync(agentFilePath);
      return true;
    } catch (error) {
      console.error('Error uninstalling Launch Agent autostart:', error);
      return false;
    }
  }

  async isInstalled(marker: string): Promise<boolean> {
    try {
      const homeDir = process.env.HOME;
      if (!homeDir) {
        throw new Error('Could not determine user home directory');
      }

      const agentFilePath = `${homeDir}/Library/LaunchAgents/${name}-${marker}.plist`;
      return fs.existsSync(agentFilePath);
    } catch (error) {
      console.error(
        'Error checking if Launch Agent autostart is installed:',
        error,
      );
      return false;
    }
  }
}
