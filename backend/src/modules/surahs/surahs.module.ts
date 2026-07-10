import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Surah, SurahSchema } from '@database/mongoose/schemas';
import { SURAH_REPOSITORY } from './domain/repositories/surah.repository.interface';
import { SurahRepository } from './infrastructure/repositories/surah.repository';
import { ListSurahsUseCase } from './application/use-cases/list-surahs.use-case';
import { GetSurahUseCase } from './application/use-cases/get-surah.use-case';
import { SurahsController } from './infrastructure/controllers/surahs.controller';

/**
 * Surahs Module — Phase 5.
 * Owns the `surahs` platform-global reference collection.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Surah.name, schema: SurahSchema }])],
  controllers: [SurahsController],
  providers: [
    { provide: SURAH_REPOSITORY, useClass: SurahRepository },
    ListSurahsUseCase,
    GetSurahUseCase,
  ],
  exports: [SURAH_REPOSITORY],
})
export class SurahsModule {}
