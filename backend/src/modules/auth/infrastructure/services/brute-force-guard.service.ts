import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ILoginAttemptRepository,
  LOGIN_ATTEMPT_REPOSITORY,
} from '../../domain/repositories/login-attempt.repository.interface';

const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES_BEFORE_LOCK = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_IP = 20; // across all identifiers, same window

/**
 * Brute-force / credential-stuffing protection, layered on top of the
 * `@nestjs/throttler` global rate limiting already configured
 * (`throttle.ttl`/`throttle.limit`, IP-based, protects every endpoint
 * equally). This service adds auth-specific, identity-aware signal that
 * generic rate limiting cannot: how many times has *this exact account*
 * failed recently, regardless of which IP the attacker is rotating
 * through.
 */
@Injectable()
export class BruteForceGuardService {
  constructor(
    @Inject(LOGIN_ATTEMPT_REPOSITORY) private readonly loginAttempts: ILoginAttemptRepository,
  ) {}

  async assertNotRateLimited(tenantId: Types.ObjectId | string, ipAddress: string): Promise<void> {
    const count = await this.loginAttempts.countRecentFromIp(tenantId, ipAddress, FAILURE_WINDOW_MS);
    if (count >= MAX_ATTEMPTS_PER_IP) {
      throw new Error('Too many login attempts from this network. Try again later.');
    }
  }

  async computeLockout(tenantId: Types.ObjectId | string, identifier: string): Promise<Date | null> {
    const failures = await this.loginAttempts.countRecentFailures(tenantId, identifier, FAILURE_WINDOW_MS);
    if (failures + 1 >= MAX_FAILURES_BEFORE_LOCK) {
      return new Date(Date.now() + LOCK_DURATION_MS);
    }
    return null;
  }

  static get maxFailuresBeforeLock(): number {
    return MAX_FAILURES_BEFORE_LOCK;
  }
}
