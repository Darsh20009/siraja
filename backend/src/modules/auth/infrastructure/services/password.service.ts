import { Injectable } from '@nestjs/common';
import { hash as argon2hash, verify as argon2verify, argon2id, HashOptions } from 'argon2';

/**
 * Password hashing/verification — Argon2id, the OWASP-recommended
 * default (memory-hard, resists GPU/ASIC cracking better than
 * bcrypt/scrypt at equivalent settings). Centralized here so every use
 * case hashes/verifies identically instead of each re-implementing
 * argon2 options.
 */
@Injectable()
export class PasswordService {
  private readonly options: HashOptions = {
    type: argon2id,
    memoryCost: 19456, // ~19 MB, OWASP baseline
    timeCost: 2,
    parallelism: 1,
  };

  hash(plain: string): Promise<string> {
    return argon2hash(plain, this.options);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2verify(hash, plain).catch(() => false);
  }

  /**
   * Minimum complexity gate enforced before hashing (defense in depth —
   * the frontend also validates). Kept intentionally simple; a
   * dedicated password-policy module can replace this later without
   * touching call sites.
   */
  assertStrongEnough(plain: string): void {
    if (plain.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
  }
}
