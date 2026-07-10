import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Juz, JuzSchema, QuranPage, QuranPageSchema } from '@database/mongoose/schemas';
import { QURAN_METADATA_REPOSITORY } from './domain/repositories/quran-metadata.repository.interface';
import { QuranMetadataRepository } from './infrastructure/repositories/quran-metadata.repository';
import { ListJuzsUseCase } from './application/use-cases/list-juzs.use-case';
import { ListPagesUseCase } from './application/use-cases/list-pages.use-case';
import { QuranMetadataController } from './infrastructure/controllers/quran-metadata.controller';

/** Quran Metadata Module — Phase 5. Owns `juzs` and `quran_pages`. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Juz.name, schema: JuzSchema },
      { name: QuranPage.name, schema: QuranPageSchema },
    ]),
  ],
  controllers: [QuranMetadataController],
  providers: [
    { provide: QURAN_METADATA_REPOSITORY, useClass: QuranMetadataRepository },
    ListJuzsUseCase,
    ListPagesUseCase,
  ],
  exports: [QURAN_METADATA_REPOSITORY],
})
export class QuranMetadataModule {}
