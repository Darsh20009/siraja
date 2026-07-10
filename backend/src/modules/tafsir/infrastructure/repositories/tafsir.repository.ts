import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tafsir, TafsirDocument } from '@database/mongoose/schemas';
import {
  CreateTafsirInput,
  ITafsirRepository,
  TafsirRecord,
} from '../../domain/repositories/tafsir.repository.interface';

@Injectable()
export class TafsirRepository implements ITafsirRepository {
  constructor(@InjectModel(Tafsir.name) private readonly model: Model<TafsirDocument>) {}

  async findForAyah(surahNumber: number, ayahNumber: number, source?: string): Promise<TafsirRecord[]> {
    const filter: Record<string, unknown> = { surahNumber, ayahNumber, isDeleted: false };
    if (source) filter.source = source;
    const docs = await this.model.find(filter).lean();
    return docs.map(toRecord);
  }

  async upsert(input: CreateTafsirInput): Promise<TafsirRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { surahNumber: input.surahNumber, ayahNumber: input.ayahNumber, source: input.source, language: input.language },
        { $set: input },
        { upsert: true, new: true },
      )
      .lean();
    return toRecord(doc!);
  }
}

function toRecord(doc: any): TafsirRecord {
  return {
    id: String(doc._id),
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    source: doc.source,
    language: doc.language,
    text: doc.text,
  };
}
