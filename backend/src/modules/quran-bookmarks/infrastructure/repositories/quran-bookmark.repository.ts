import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  QuranBookmark,
  QuranBookmarkDocument,
  QuranLastRead,
  QuranLastReadDocument,
} from '@database/mongoose/schemas';
import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';
import {
  CreateQuranBookmarkInput,
  IQuranBookmarkRepository,
  QuranBookmarkRecord,
  QuranLastReadRecord,
} from '../../domain/repositories/quran-bookmark.repository.interface';

@Injectable()
export class QuranBookmarkRepository implements IQuranBookmarkRepository {
  constructor(
    @InjectModel(QuranBookmark.name) private readonly bookmarkModel: Model<QuranBookmarkDocument>,
    @InjectModel(QuranLastRead.name) private readonly lastReadModel: Model<QuranLastReadDocument>,
  ) {}

  async create(input: CreateQuranBookmarkInput): Promise<QuranBookmarkRecord> {
    try {
      const doc = await this.bookmarkModel.create({
        tenantId: new Types.ObjectId(input.tenantId),
        user: new Types.ObjectId(input.userId),
        surahNumber: input.surahNumber,
        ayahNumber: input.ayahNumber,
        type: input.type,
        label: input.label,
      });
      return toRecord(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('This Ayah is already bookmarked with this type.');
      }
      throw error;
    }
  }

  async findAllForUser(
    tenantId: string,
    userId: string,
    type?: QuranBookmarkType,
  ): Promise<QuranBookmarkRecord[]> {
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      user: new Types.ObjectId(userId),
      isDeleted: false,
    };
    if (type) filter.type = type;
    const docs = await this.bookmarkModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map(toRecord);
  }

  async findOwnedById(
    tenantId: string,
    userId: string,
    bookmarkId: string,
  ): Promise<QuranBookmarkRecord | null> {
    if (!Types.ObjectId.isValid(bookmarkId)) return null;
    const doc = await this.bookmarkModel
      .findOne({
        _id: new Types.ObjectId(bookmarkId),
        tenantId: new Types.ObjectId(tenantId),
        user: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async delete(tenantId: string, userId: string, bookmarkId: string): Promise<void> {
    await this.bookmarkModel.updateOne(
      { _id: new Types.ObjectId(bookmarkId), tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }

  async upsertLastRead(
    tenantId: string,
    userId: string,
    position: { surahNumber: number; ayahNumber: number; pageNumber: number },
  ): Promise<QuranLastReadRecord> {
    const doc = await this.lastReadModel
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId) },
        { $set: { ...position, isDeleted: false, deletedAt: null } },
        { upsert: true, new: true },
      )
      .lean();
    return toLastReadRecord(doc!);
  }

  async getLastRead(tenantId: string, userId: string): Promise<QuranLastReadRecord | null> {
    const doc = await this.lastReadModel
      .findOne({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .lean();
    return doc ? toLastReadRecord(doc) : null;
  }
}

function toRecord(doc: any): QuranBookmarkRecord {
  return {
    id: String(doc._id),
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    type: doc.type,
    label: doc.label,
    createdAt: doc.createdAt,
  };
}

function toLastReadRecord(doc: any): QuranLastReadRecord {
  return {
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    pageNumber: doc.pageNumber,
    updatedAt: doc.updatedAt,
  };
}
