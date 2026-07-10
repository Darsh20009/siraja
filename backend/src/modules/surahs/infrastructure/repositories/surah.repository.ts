import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Surah, SurahDocument } from '@database/mongoose/schemas';
import {
  CreateSurahInput,
  ISurahRepository,
  SurahRecord,
} from '../../domain/repositories/surah.repository.interface';

@Injectable()
export class SurahRepository implements ISurahRepository {
  constructor(@InjectModel(Surah.name) private readonly model: Model<SurahDocument>) {}

  async findAll(): Promise<SurahRecord[]> {
    const docs = await this.model.find({ isDeleted: false }).sort({ surahNumber: 1 }).lean();
    return docs.map(toRecord);
  }

  async findByNumber(surahNumber: number): Promise<SurahRecord | null> {
    const doc = await this.model.findOne({ surahNumber, isDeleted: false }).lean();
    return doc ? toRecord(doc) : null;
  }

  async searchByName(query: string): Promise<SurahRecord[]> {
    const docs = await this.model
      .find({ $text: { $search: query }, isDeleted: false }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();
    return docs.map(toRecord);
  }

  async upsert(input: CreateSurahInput): Promise<SurahRecord> {
    const doc = await this.model
      .findOneAndUpdate({ surahNumber: input.surahNumber }, { $set: input }, { upsert: true, new: true })
      .lean();
    return toRecord(doc!);
  }
}

function toRecord(doc: any): SurahRecord {
  return {
    id: String(doc._id),
    surahNumber: doc.surahNumber,
    arabicName: doc.arabicName,
    englishName: doc.englishName,
    englishTranslationName: doc.englishTranslationName,
    revelationType: doc.revelationType,
    ayahCount: doc.ayahCount,
    revelationOrder: doc.revelationOrder,
  };
}
