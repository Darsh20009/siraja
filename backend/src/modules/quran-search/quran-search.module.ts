import { Module } from '@nestjs/common';
import { SurahsModule } from '@modules/surahs/surahs.module';
import { AyahsModule } from '@modules/ayahs/ayahs.module';
import { TextNormalizerService } from './application/services/text-normalizer.service';
import { SearchQuranUseCase } from './application/use-cases/search-quran.use-case';
import { QuranSearchController } from './infrastructure/controllers/quran-search.controller';

/**
 * Quran Search Module — Phase 5.
 * Owns no schema of its own; composes over `SurahsModule` /
 * `AyahsModule`'s exported repository tokens to run cross-cutting
 * search queries (kept out of those modules so their repositories stay
 * focused on single-entity CRUD, and search-specific concerns like
 * diacritic normalization live in one place).
 */
@Module({
  imports: [SurahsModule, AyahsModule],
  controllers: [QuranSearchController],
  providers: [TextNormalizerService, SearchQuranUseCase],
})
export class QuranSearchModule {}
