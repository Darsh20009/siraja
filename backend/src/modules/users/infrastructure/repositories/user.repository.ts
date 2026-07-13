import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { User, UserDocument } from '@database/mongoose/schemas';
import { IUserRepository, UpdateUserFields } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findById(tenantId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<UserDocument | null> {
    if (!isValidObjectId(userId)) return Promise.resolve(null);
    return this.model
      .findOne({ _id: userId, tenantId, isDeleted: { $ne: true } })
      .exec();
  }

  async update(
    tenantId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    fields: UpdateUserFields,
  ): Promise<UserDocument | null> {
    if (!isValidObjectId(userId)) return null;

    // Strip undefined fields so we only $set what was actually provided
    const $set: Record<string, unknown> = {};
    if (fields.fullName !== undefined) $set['fullName'] = fields.fullName;
    if (fields.avatarUrl !== undefined) $set['avatarUrl'] = fields.avatarUrl;
    if (fields.gender !== undefined) $set['gender'] = fields.gender;
    if (fields.preferredLocale !== undefined) $set['preferredLocale'] = fields.preferredLocale;

    if (Object.keys($set).length === 0) return this.findById(tenantId, userId);

    return this.model
      .findOneAndUpdate(
        { _id: userId, tenantId, isDeleted: { $ne: true } },
        { $set },
        { new: true },
      )
      .exec();
  }
}
