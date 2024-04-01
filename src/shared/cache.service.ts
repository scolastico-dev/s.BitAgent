import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';

import { LogService } from './log.service';

export interface KeyCacheEntry {
  key: string;
  comment: string;
}

export interface KeyCache {
  ttl: number|false;
  keys: KeyCacheEntry[];
}

@Injectable()
export class CacheService {
  constructor(private readonly logService: LogService) {}
  private path: string|null = null;
  private ttl = 0;

  /**
   * Set the path to the cache file
   * @param path The path to the cache file, or null to disable caching
   */
  setPath(path: string|null) {
    this.path = path;
  }

  /**
   * Set the cache timeout
   * @param ttl The timeout in milliseconds
   */
  setTTL(ttl: number) {
    this.ttl = ttl;
  }

  /**
   * Get the public key's from the cache
   */
  getCache(): KeyCacheEntry[]|null {
    if (!this.path || !existsSync(this.path)) return null;
    try {
      const data = JSON.parse(readFileSync(this.path, 'utf8')) as KeyCache;
      if (data.ttl !== false && data.ttl < Date.now()) return null;
      return data.keys;
    } catch (error) {
      this.logService.error('Error while reading cache:', error.message);
    }
    return null;
  }

  /**
   * Store the public key's in the cache, and reset the timeout
   */
  setCache(cache: KeyCacheEntry[]) {
    try {
      writeFileSync(this.path, JSON.stringify({
        ttl: this.ttl > 0 ? Date.now() + this.ttl : false,
        keys: cache,
      } as KeyCache, null, 2), 'utf8');
    } catch (error) {
      this.logService.error('Error while writing cache:', error.message);
    }
  }
}
