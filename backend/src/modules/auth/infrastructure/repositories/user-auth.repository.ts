import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '@database/mongoose/schemas';
import { IUserAuthRepository } from '../../domain/repositories/user-auth.repository.interface';

@Injectable()
export class UserAuthRepository implements IUserAuthRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(tenantId: Types.ObjectId | string, email: string) {
    return this.userModel
      .findOne({ tenantId, email: email.toLowerCase(), isDeleted: false })
      .select('+passwordHash')
      .exec();
  }

  findByPhone(tenantId: Types.ObjectId | string, phone: string) {
    return this.userModel.findOne({ tenantId, phone, isDeleted: false }).select('+passwordHash').exec();
  }

  findById(id: Types.ObjectId | string) {
    return this.userModel.findOne({ _id: id, isDeleted: false }).select('+passwordHash').exec();
  }

  findByLinkedProvider(tenantId: Types.ObjectId | string, provider: string, providerUserId: string) {
    return this.userModel
      .findOne({
        tenantId,
        isDeleted: false,
        linkedProviders: { $elemMatch: { provider, providerUserId } },
      })
      .exec();
  }

  create(data: Partial<User>) {
    return this.userModel.create(data as Parameters<typeof this.userModel.create>[0]);
  }

  updateById(id: Types.ObjectId | string, update: Partial<User>) {
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
