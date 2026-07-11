import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AyahNote, AyahNoteDocument } from '@database/mongoose/schemas';
import {
  AyahNoteFilter,
  AyahNoteRecord,
  CreateAyahNoteInput,
  IAyahNoteRepository,
} from '../../domain/repositories/ayah-note.repository.interface';

@Injectable()
export class AyahNoteRepository implements IAyahNoteRepository {
  constructor(
    @InjectModel(AyahNote.name)
    private readonly model: Model<AyahNoteDocument>,
  ) {}

  async create(input: CreateAyahNoteInput): Promise<AyahNoteRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      author: new Types.ObjectId(input.authorId),
      surahNumber: input.surahNumber,
      ayahNumber: input.ayahNumber,
      text: input.text,
    });
    return toRecord(doc.toObject());
  }

  async findById(tenantId: string, noteId: string): Promise<AyahNoteRecord | null> {
    if (!Types.ObjectId.isValid(noteId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(noteId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(tenantId: string, studentId: string, filter: AyahNoteFilter = {}): Promise<AyahNoteRecord[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    if (filter.surahNumber) query.surahNumber = filter.surahNumber;
    if (filter.ayahNumber) query.ayahNumber = filter.ayahNumber;

    const docs = await this.model.find(query).sort({ surahNumber: 1, ayahNumber: 1, createdAt: -1 }).lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, noteId: string, text: string): Promise<AyahNoteRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(noteId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: { text } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Ayah note not found.');
    return toRecord(doc);
  }

  async delete(tenantId: string, noteId: string): Promise<void> {
    const result = await this.model.updateOne(
      { _id: new Types.ObjectId(noteId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    if (result.matchedCount === 0) throw new NotFoundException('Ayah note not found.');
  }
}

function toRecord(doc: any): AyahNoteRecord {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    authorId: String(doc.author),
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    text: doc.text,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
