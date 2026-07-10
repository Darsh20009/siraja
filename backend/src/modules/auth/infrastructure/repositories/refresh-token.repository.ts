import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from '@database/mongoose/schemas';
import {
  CreateRefreshTokenInput,
  IRefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  create(input: CreateRefreshTokenInput) {
    return this.refreshTokenModel.create(input);
  }

  findActiveByHash(tokenHash: string) {
    return this.refreshTokenModel.findOne({ tokenHash }).select('+tokenHash').exec();
  }

  async revokeById(id: any, reason: string, replacedByTokenId?: any) {
    await this.refreshTokenModel
      .updateOne({ _id: id }, { revokedAt: new Date(), revokedReason: reason, replacedByTokenId: replacedByTokenId ?? null })
      .exec();
  }

  async revokeAllForUser(userId: any, reason: string) {
    await this.refreshTokenModel
      .updateMany({ userId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason })
      .exec();
  }

  async revokeAllForDevice(deviceId: any, reason: string) {
    await this.refreshTokenModel
      .updateMany({ deviceId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason })
      .exec();
  }

  async revokeFamily(familyId: string, reason: string) {
    await this.refreshTokenModel
      .updateMany({ familyId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason })
      .exec();
  }

  listActiveForUser(userId: any) {
    return this.refreshTokenModel
      .find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();
  }
}
