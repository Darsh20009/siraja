import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ayah, AyahSchema } from '@database/mongoose/schemas';
import { AYAH_REPOSITORY } from './domain/repositories/ayah.repository.interface';
import { AyahRepository } from './infrastructure/repositories/ayah.repository';
import { ListAyahsBySurahUseCase } from './application/use-cases/list-ayahs-by-surah.use-case';
import { GetAyahUseCase } from './application/use-cases/get-ayah.use-case';
import { GetAyahsByPageUseCase } from './application/use-cases/get-ayahs-by-page.use-case';
import { GetAyahsByJuzUseCase } from './application/use-cases/get-ayahs-by-juz.use-case';
import { AyahsController } from './infrastructure/controllers/ayahs.controller';

/**
 * Ayahs Module — Phase 5.
 * Owns the `ayahs` platform-global reference collection (6,236 documents).
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Ayah.name, schema: AyahSchema }])],
  controllers: [AyahsController],
  providers: [
    { provide: AYAH_REPOSITORY, useClass: AyahRepository },
    ListAyahsBySurahUseCase,
    GetAyahUseCase,
    GetAyahsByPageUseCase,
    GetAyahsByJuzUseCase,
  ],
  exports: [AYAH_REPOSITORY],
})
export class AyahsModule {}
