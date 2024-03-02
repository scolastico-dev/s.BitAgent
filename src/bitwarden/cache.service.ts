import { Injectable } from '@nestjs/common';
import { BitwardenService } from './bitwarden.service';
import { BitwardenKeyItem } from './bitwarden.type';
import { SessionService } from './session.service';
import { LogService } from 'src/shared/log.service';

@Injectable()
export class CacheService {
  private timeout = 300_000;
  private cache: BitwardenKeyItem[] = [];
  private scheduler: NodeJS.Timeout | null = null;
  private lastRefill = 0;

  constructor(
    private readonly bitService: BitwardenService,
    private readonly logService: LogService,
    private readonly sessionService: SessionService,
  ) {}

  private resetTimeout() {
    if (this.scheduler) clearTimeout(this.scheduler);
    this.scheduler = setTimeout(() => {
      this.scheduler = null;
      this.cache = [];
    }, this.timeout);
  }

  private isCacheValid() {
    return this.cache.length && Date.now() - this.lastRefill < this.timeout;
  }

  private async getCacheInternal(
    reason: string | null,
    token: string | null,
  ): Promise<BitwardenKeyItem[]> {
    this.resetTimeout();
    if (!this.isCacheValid()) {
      this.logService.info('Refilling cache');
      const sess = token ? token : await this.sessionService.getSession(reason);
      this.cache = this.bitService.getKeyItems(sess);
      this.lastRefill = Date.now();
    }
    return this.cache;
  }

  getCache(reason: string | null): Promise<BitwardenKeyItem[]> {
    return this.getCacheInternal(reason, null);
  }

  getCacheWithToken(token: string): Promise<BitwardenKeyItem[]> {
    return this.getCacheInternal(null, token);
  }
}
