import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuranNote, QuranNoteDocument } from '@database/mongoose/schemas';
import {
  CreateQuranNoteInput,
  IQuranNoteRepository,
  QuranNoteRecord,
  UpdateQuranNoteInput,
} from '../../domain/repositories/quran-note.repository.interface';

@Injectable()
export class QuranNoteRepository implements IQuranNoteRepository {
  constructor(@InjectModel(QuranNote.name) private readonly model: Model<QuranNoteDocument>) {}

  async create(input: CreateQuranNoteInput): Promise<QuranNoteRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      user: new Types.ObjectId(input.userId),
      scope: input.scope,
      surahNumber: input.surahNumber,
      ayahNumber: input.ayahNumber,
      text: input.text,
    });
    return toRecord(doc);
  }

  async findAllForUser(tenantId: string, userId: string): Promise<QuranNoteRecord[]> {
    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toRecord);
  }

  async findOwnedById(tenantId: string, userId: string, noteId: string): Promise<QuranNoteRecord | null> {
    if (!Types.ObjectId.isValid(noteId)) return null;
    const doc = await this.model
      .findOne({
        _id: new Types.ObjectId(noteId),
        tenantId: new Types.ObjectId(tenantId),
        user: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async update(
    tenantId: string,
    userId: string,
    noteId: string,
    input: UpdateQuranNoteInput,
  ): Promise<QuranNoteRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(noteId), tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false },
        { $set: { text: input.text } },
        { new: true },
      )
      .lean();
    if (!doc) {
      throw new NotFoundException('Note not found.');
    }
    return toRecord(doc);
  }

  async delete(tenantId: string, userId: string, noteId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(noteId), tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }
}

function toRecord(doc: any): QuranNoteRecord {
  return {
    id: String(doc._id),
    scope: doc.scope,
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    text: doc.text,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
