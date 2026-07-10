import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationToken, VerificationTokenDocument } from '@database/mongoose/schemas';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';
import {
  CreateVerificationTokenInput,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';

@Injectable()
export class VerificationTokenRepository implements IVerificationTokenRepository {
  constructor(
    @InjectModel(VerificationToken.name)
    private readonly tokenModel: Model<VerificationTokenDocument>,
  ) {}

  create(input: CreateVerificationTokenInput) {
    return this.tokenModel.create(input);
  }

  findActiveByHash(tokenHash: string, purpose: TokenPurpose) {
    return this.tokenModel
      .findOne({ tokenHash, purpose, consumedAt: null, expiresAt: { $gt: new Date() } })
      .select('+tokenHash')
      .exec();
  }

  async consume(id: any) {
    await this.tokenModel.updateOne({ _id: id }, { consumedAt: new Date() }).exec();
  }

  async invalidateAllForUser(userId: any, purpose: TokenPurpose) {
    await this.tokenModel
      .updateMany({ userId, purpose, consumedAt: null }, { consumedAt: new Date() })
      .exec();
  }
}
