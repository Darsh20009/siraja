import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ayah, AyahDocument } from '@database/mongoose/schemas';
import {
  AyahRecord,
  CreateAyahInput,
  IAyahRepository,
} from '../../domain/repositories/ayah.repository.interface';

@Injectable()
export class AyahRepository implements IAyahRepository {
  constructor(@InjectModel(Ayah.name) private readonly model: Model<AyahDocument>) {}

  async findBySurah(surahNumber: number): Promise<AyahRecord[]> {
    const docs = await this.model.find({ surahNumber, isDeleted: false }).sort({ ayahNumber: 1 }).lean();
    return docs.map(toRecord);
  }

  async findOne(surahNumber: number, ayahNumber: number): Promise<AyahRecord | null> {
    const doc = await this.model.findOne({ surahNumber, ayahNumber, isDeleted: false }).lean();
    return doc ? toRecord(doc) : null;
  }

  async findByPage(pageNumber: number): Promise<AyahRecord[]> {
    const docs = await this.model
      .find({ pageNumber, isDeleted: false })
      .sort({ surahNumber: 1, ayahNumber: 1 })
      .lean();
    return docs.map(toRecord);
  }

  async findByJuz(juzNumber: number): Promise<AyahRecord[]> {
    const docs = await this.model
      .find({ juzNumber, isDeleted: false })
      .sort({ surahNumber: 1, ayahNumber: 1 })
      .lean();
    return docs.map(toRecord);
  }

  async searchByText(normalizedQuery: string): Promise<AyahRecord[]> {
    const docs = await this.model
      .find(
        { $text: { $search: normalizedQuery }, isDeleted: false },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(30)
      .lean();
    return docs.map(toRecord);
  }

  async upsert(input: CreateAyahInput): Promise<AyahRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { surahNumber: input.surahNumber, ayahNumber: input.ayahNumber },
        { $set: input },
        { upsert: true, new: true },
      )
      .lean();
    return toRecord(doc!);
  }
}

function toRecord(doc: any): AyahRecord {
  return {
    id: String(doc._id),
    globalAyahNumber: doc.globalAyahNumber,
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    pageNumber: doc.pageNumber,
    juzNumber: doc.juzNumber,
    hizbNumber: doc.hizbNumber,
    arabicText: doc.arabicText,
  };
}
