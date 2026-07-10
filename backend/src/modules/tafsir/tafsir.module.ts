import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tafsir, TafsirSchema } from '@database/mongoose/schemas';
import { TAFSIR_REPOSITORY } from './domain/repositories/tafsir.repository.interface';
import { TafsirRepository } from './infrastructure/repositories/tafsir.repository';
import { GetTafsirForAyahUseCase } from './application/use-cases/get-tafsir-for-ayah.use-case';
import { TafsirController } from './infrastructure/controllers/tafsir.controller';

/** Tafsir Module — Phase 5. Owns the `tafsirs` platform-global reference collection. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Tafsir.name, schema: TafsirSchema }])],
  controllers: [TafsirController],
  providers: [{ provide: TAFSIR_REPOSITORY, useClass: TafsirRepository }, GetTafsirForAyahUseCase],
  exports: [TAFSIR_REPOSITORY],
})
export class TafsirModule {}
