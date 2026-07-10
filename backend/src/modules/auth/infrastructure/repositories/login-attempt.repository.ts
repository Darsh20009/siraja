import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginAttempt, LoginAttemptDocument } from '@database/mongoose/schemas';
import {
  ILoginAttemptRepository,
  RecordLoginAttemptInput,
} from '../../domain/repositories/login-attempt.repository.interface';

@Injectable()
export class LoginAttemptRepository implements ILoginAttemptRepository {
  constructor(
    @InjectModel(LoginAttempt.name) private readonly loginAttemptModel: Model<LoginAttemptDocument>,
  ) {}

  async record(input: RecordLoginAttemptInput) {
    await this.loginAttemptModel.create(input);
  }

  countRecentFailures(tenantId: any, identifier: string, sinceMs: number) {
    return this.loginAttemptModel.countDocuments({
      tenantId,
      identifier: identifier.toLowerCase(),
      success: false,
      createdAt: { $gte: new Date(Date.now() - sinceMs) },
    });
  }

  countRecentFromIp(tenantId: any, ipAddress: string, sinceMs: number) {
    return this.loginAttemptModel.countDocuments({
      tenantId,
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - sinceMs) },
    });
  }

  async hasRecentSuccessFrom(userId: any, ipAddress: string, userAgent: string | undefined, sinceMs: number) {
    const match = await this.loginAttemptModel
      .findOne({
        userId,
        success: true,
        ipAddress,
        ...(userAgent ? { userAgent } : {}),
        createdAt: { $gte: new Date(Date.now() - sinceMs) },
      })
      .exec();
    return !!match;
  }
}
