import { Injectable } from '@nestjs/common';
import { BitwardenService } from './bitwarden.service';
import { LogService } from 'src/shared/log.service';
import { GuiService } from 'src/gui/gui.service';

@Injectable()
export class SessionService {
  sessionTimeout: NodeJS.Timeout | null = null;
  currentSession: string | null = null;

  private config = {
    timeout: 60 * 5,
    retrys: 1,
  };

  constructor(
    private readonly bitService: BitwardenService,
    private readonly logService: LogService,
    private readonly guiService: GuiService,
  ) {
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
      process.on(signal, () => this.lock());
    });
  }

  updateConfig(config: Partial<typeof SessionService.prototype.config>) {
    this.config = { ...this.config, ...config };
  }

  lock() {
    if (!this.currentSession) return;
    this.logService.warn('Session expired, logging out');
    this.bitService.lock(this.currentSession);
    this.currentSession = null;
  }

  resetTimeout() {
    clearTimeout(this.sessionTimeout);
    this.sessionTimeout = setTimeout(() => this.lock(), 1000 * 60 * 5);
  }

  async getSession(reason: string | null): Promise<string | null> {
    const confirm = !reason
      ? 'true'
      : await this.guiService.getInput(reason, 'confirm', this.config.timeout);
    if (confirm !== 'true') {
      this.logService.warn('Session request denied');
      return null;
    }
    if (this.currentSession) {
      this.resetTimeout();
      return this.currentSession;
    }
    this.logService.info('Requesting session');
    const password = await this.guiService.getInput(
      'Please enter your master password',
      'password',
      this.config.timeout,
    );
    if (!password) {
      this.logService.warn('Session request denied');
      return null;
    }
    try {
      this.currentSession = this.bitService.unlock(password);
    } catch (e) {
      this.logService.error('Failed to unlock session:', e);
      return null;
    }
    this.resetTimeout();
    this.bitService.run(this.currentSession, 'sync');
    return this.currentSession;
  }
}