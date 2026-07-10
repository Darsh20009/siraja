import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Juz, JuzDocument, QuranPage, QuranPageDocument } from '@database/mongoose/schemas';
import {
  CreateJuzInput,
  CreateQuranPageInput,
  IQuranMetadataRepository,
  JuzRecord,
  QuranPageRecord,
} from '../../domain/repositories/quran-metadata.repository.interface';

@Injectable()
export class QuranMetadataRepository implements IQuranMetadataRepository {
  constructor(
    @InjectModel(Juz.name) private readonly juzModel: Model<JuzDocument>,
    @InjectModel(QuranPage.name) private readonly pageModel: Model<QuranPageDocument>,
  ) {}

  async findAllJuzs(): Promise<JuzRecord[]> {
    const docs = await this.juzModel.find({ isDeleted: false }).sort({ juzNumber: 1 }).lean();
    return docs.map(toJuzRecord);
  }

  async findJuz(juzNumber: number): Promise<JuzRecord | null> {
    const doc = await this.juzModel.findOne({ juzNumber, isDeleted: false }).lean();
    return doc ? toJuzRecord(doc) : null;
  }

  async upsertJuz(input: CreateJuzInput): Promise<JuzRecord> {
    const doc = await this.juzModel
      .findOneAndUpdate({ juzNumber: input.juzNumber }, { $set: input }, { upsert: true, new: true })
      .lean();
    return toJuzRecord(doc!);
  }

  async findAllPages(): Promise<QuranPageRecord[]> {
    const docs = await this.pageModel.find({ isDeleted: false }).sort({ pageNumber: 1 }).lean();
    return docs.map(toPageRecord);
  }

  async findPage(pageNumber: number): Promise<QuranPageRecord | null> {
    const doc = await this.pageModel.findOne({ pageNumber, isDeleted: false }).lean();
    return doc ? toPageRecord(doc) : null;
  }

  async upsertPage(input: CreateQuranPageInput): Promise<QuranPageRecord> {
    const doc = await this.pageModel
      .findOneAndUpdate({ pageNumber: input.pageNumber }, { $set: input }, { upsert: true, new: true })
      .lean();
    return toPageRecord(doc!);
  }
}

function toJuzRecord(doc: any): JuzRecord {
  return {
    id: String(doc._id),
    juzNumber: doc.juzNumber,
    startSurahNumber: doc.startSurahNumber,
    startAyahNumber: doc.startAyahNumber,
    endSurahNumber: doc.endSurahNumber,
    endAyahNumber: doc.endAyahNumber,
  };
}

function toPageRecord(doc: any): QuranPageRecord {
  return {
    id: String(doc._id),
    pageNumber: doc.pageNumber,
    startSurahNumber: doc.startSurahNumber,
    startAyahNumber: doc.startAyahNumber,
    juzNumber: doc.juzNumber,
  };
}
