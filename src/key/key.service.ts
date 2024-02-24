import { Injectable } from '@nestjs/common';

import { LogService } from '../shared/log.service';

import * as SshPK from 'sshpk';
import * as Crypto from 'crypto';

export enum SUPPORTED_MODULI {
  MODULI_2048 = 2048,
  MODULI_3072 = 3072,
  MODULI_4096 = 4096,
}

@Injectable()
export class KeyService {
  constructor(private readonly logService: LogService) {}

  /**
   * Generate a new RSA OpenSSH key pair
   * @param modulus The modulus of the key
   */
  generateRSAKey(modulus: SUPPORTED_MODULI): string {
    return Crypto.generateKeyPairSync('rsa', {
      modulusLength: modulus,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    }).privateKey;
  }

  /**
   * Generate a public key in the OpenSSH format from a private key
   * @param privateKey The private key to generate the public key from
   */
  generatePublicKey(privateKey: string, name: string = ''): string {
    const key = SshPK.parsePrivateKey(privateKey);
    key.comment = name;
    return key.toPublic().toString('ssh');
  }

  /**
   * Decrypt a private key using a passphrase
   * @param privateKey The private key to decrypt
   * @param passphrase The passphrase to use for decryption
   */
  decryptPrivateKey(privateKey: string, passphrase: string): string {
    const key = SshPK.parsePrivateKey(privateKey, 'pem', { passphrase });
    return key.toString('pem');
  }
}
