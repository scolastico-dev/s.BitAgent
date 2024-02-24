import { Injectable } from '@nestjs/common';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import {
  BitwardenItemBase,
  BitwardenKeyCreateItem,
  BitwardenKeyItem,
} from './bitwarden.type';
import * as path from 'path';

@Injectable()
export class BitwardenService {
  private logging = false;

  /**
   * Enables DEBUG logging of Bitwarden CLI commands. (stdio: inherit)
   * This is a debug feature and should not be enabled in production,
   * as it will also prevent any data from being returned from the Bitwarden CLI.
   */
  enableLogging() {
    this.logging = true;
  }

  /**
   * Finds the path to the Bitwarden CLI executable.
   *
   * @returns The path to the Bitwarden CLI executable.
   * @throws Error if the Bitwarden CLI is not found.
   */
  private find() {
    const curDir = path.dirname(__filename);
    const str = [
      ...Array(5)
        .fill(0)
        .map((_, i) => '../'.repeat(i))
        .map((path) => `${path}node_modules/@bitwarden/cli/build/bw.js`),
      './node_modules/@bitwarden/cli/build/bw.js',
      './@bitwarden/cli/build/bw.js',
    ]
      .map((p) => path.join(curDir, p))
      .find((p) => existsSync(p));
    if (!str) throw new Error('Bitwarden CLI not found');
    return str;
  }

  /**
   * Runs the Bitwarden CLI command with the specified session and arguments.
   *
   * @param session - The session string or null if no session is provided.
   * @param args - The arguments to pass to the Bitwarden CLI command.
   * @returns The stdout output of the Bitwarden CLI command.
   * @throws An error if the Bitwarden CLI command exits with a non-zero status.
   */
  run(session: string | null, ...args: string[]): string {
    const sess = session ? ['--session', session] : [];
    const { status, stdout, stderr } = spawnSync(
      'node',
      [this.find(), ...args, ...sess],
      { encoding: 'utf8', stdio: this.logging ? 'inherit' : 'pipe' },
    );
    if (status !== 0)
      throw new Error(
        `Bitwarden CLI exited with status ${status}\nMessage:${stderr}`,
      );
    return stdout;
  }

  /**
   * Unlocks the Bitwarden service with the provided password.
   * @param password - The password to unlock the Bitwarden service.
   * @returns The unlocked Bitwarden service as a string.
   */
  unlock(password: string): string {
    return this.run(null, 'unlock', password, '--raw').trim();
  }

  /**
   * Locks the Bitwarden session.
   * @param session The session to lock.
   */
  lock(session: string): void {
    this.run(session, 'lock');
  }

  /**
   * Creates a Bitwarden item.
   *
   * @param object - The BitwardenKeyCreateItem object containing the item details.
   * @param session - The session string.
   * @returns The created item as a string.
   */
  create(object: BitwardenKeyCreateItem, session: string): string {
    const base64 = Buffer.from(JSON.stringify(object)).toString('base64');
    return this.run(session, 'create', 'item', '--raw', base64);
  }

  /**
   * Retrieves the key items from Bitwarden for the specified session.
   * @param session The session identifier.
   * @returns An array of BitwardenKeyItem objects.
   */
  getKeyItems(session: string): BitwardenKeyItem[] {
    const items = JSON.parse(
      this.run(session, 'list', 'items'),
    ) as BitwardenItemBase[];
    // TODO: Implement later object validation
    return items.filter(
      (item) =>
        !item.deletedDate &&
        item.fields?.some(
          (field) => field.name === 'custom-type' && field.value === 'ssh-key',
        ),
    ) as BitwardenKeyItem[];
  }
}
