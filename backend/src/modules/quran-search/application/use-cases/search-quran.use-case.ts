import { Inject, Injectable } from '@nestjs/common';
import { ISurahRepository, SURAH_REPOSITORY } from '@modules/surahs/domain/repositories/surah.repository.interface';
import { AYAH_REPOSITORY, IAyahRepository } from '@modules/ayahs/domain/repositories/ayah.repository.interface';
import { TextNormalizerService } from '../services/text-normalizer.service';

export interface QuranSearchResult {
  surahs: Awaited<ReturnType<ISurahRepository['searchByName']>>;
  ayahs: Awaited<ReturnType<IAyahRepository['searchByText']>>;
}

/**
 * Unified search across Surah names and Ayah text/keywords — see
 * `docs/architecture/11-quran-blueprint.md` §Search Architecture for the
 * index strategy this relies on ($text indexes + diacritic normalization).
 */
@Injectable()
export class SearchQuranUseCase {
  constructor(
    @Inject(SURAH_REPOSITORY) private readonly surahRepository: ISurahRepository,
    @Inject(AYAH_REPOSITORY) private readonly ayahRepository: IAyahRepository,
    private readonly textNormalizer: TextNormalizerService,
  ) {}

  async execute(query: string): Promise<QuranSearchResult> {
    const normalized = this.textNormalizer.normalizeArabic(query);
    const [surahs, ayahs] = await Promise.all([
      this.surahRepository.searchByName(query),
      this.ayahRepository.searchByText(normalized),
    ]);
    return { surahs, ayahs };
  }
}
