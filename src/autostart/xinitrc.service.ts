import { Injectable } from '@nestjs/common';
import { AutostartService } from './autostart.interface';
import * as fs from 'fs';

@Injectable()
export class XinitrcAutostartService implements AutostartService {
  name = 'Xinitrc Autostart';

  async canActivate(): Promise<boolean> {
    // Assuming the existence of .xinitrc implies X Window System use
    const homeDir = process.env.HOME;
    if (!homeDir) {
      return false;
    }
    return fs.existsSync(`${homeDir}/.xinitrc`);
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

      const xinitrcPath = `${homeDir}/.xinitrc`;
      const currentContent = fs.existsSync(xinitrcPath)
        ? fs.readFileSync(xinitrcPath, 'utf-8')
        : '';

      // Avoid duplicates
      if (currentContent.includes(marker)) {
        console.warn('Autostart entry already exists in .xinitrc');
        return false;
      }

      const newContent = currentContent + `${command} # ${marker}\n`;
      fs.writeFileSync(xinitrcPath, newContent);

      return true;
    } catch (error) {
      console.error('Error installing Xinitrc autostart:', error);
      return false;
    }
  }

  async uninstall(marker: string): Promise<boolean> {
    try {
      const homeDir = process.env.HOME;
      if (!homeDir) {
        throw new Error('Could not determine user home directory');
      }

      const xinitrcPath = `${homeDir}/.xinitrc`;
      const currentContent = fs.readFileSync(xinitrcPath, 'utf-8');

      const newContent = currentContent
        .split('\n')
        .filter((line) => !line.includes(marker))
        .join('\n');

      fs.writeFileSync(xinitrcPath, newContent);
      return true;
    } catch (error) {
      console.error('Error uninstalling Xinitrc autostart:', error);
      return false;
    }
  }

  async isInstalled(marker: string): Promise<boolean> {
    try {
      const homeDir = process.env.HOME;
      if (!homeDir) {
        throw new Error('Could not determine user home directory');
      }

      const xinitrcPath = `${homeDir}/.xinitrc`;
      const currentContent = fs.existsSync(xinitrcPath)
        ? fs.readFileSync(xinitrcPath, 'utf-8')
        : '';
      return currentContent.includes(marker);
    } catch (error) {
      console.error('Error checking if Xinitrc autostart is installed:', error);
      return false;
    }
  }
}
