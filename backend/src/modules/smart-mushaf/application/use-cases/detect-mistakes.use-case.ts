import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { MistakeDetectorService, DetectedMistake } from '@shared/quran/mistake-detector.service';
import { normalizeArabic } from '@shared/quran/arabic-normalizer.util';
import { AYAH_REPOSITORY, IAyahRepository } from '@modules/ayahs/domain/repositories/ayah.repository.interface';

export interface DetectMistakesInput {
  recitedText: string;
  surahNumber: number;
  ayahNumber: number;
}

export interface DetectMistakesOutput {
  surahNumber: number;
  ayahNumber: number;
  referenceText: string;
  normalizedRecited: string;
  detectedMistakes: DetectedMistake[];
  mistakeSummary: Record<string, number>;
}

/**
 * DetectMistakesUseCase — Phase 12B Priority 3.
 *
 * Stateless: compares recited text against the reference ayah text
 * from the Quran corpus and returns detected mistakes. Does NOT write
 * to the database — the sheikh confirms and submits via LogMistakeUseCase.
 *
 * RBAC: smart_mushaf.create (sheikhs, tenant admins).
 */
@Injectable()
export class DetectMistakesUseCase {
  constructor(
    private readonly detector: MistakeDetectorService,
    @Inject(AYAH_REPOSITORY)
    private readonly ayahRepo: IAyahRepository,
  ) {}

  async execute(_user: AccessTokenPayload, input: DetectMistakesInput): Promise<DetectMistakesOutput> {
    if (!input.recitedText?.trim()) {
      throw new BadRequestException('recitedText must not be empty.');
    }

    const ayahs = await this.ayahRepo.findBySurah(input.surahNumber);
    const ayah = ayahs.find((a) => a.ayahNumber === input.ayahNumber);
    if (!ayah) {
      throw new NotFoundException(
        `Ayah ${input.ayahNumber} of Surah ${input.surahNumber} not found in corpus.`,
      );
    }

    const detectedMistakes = this.detector.detect({
      recitedText: input.recitedText,
      referenceText: ayah.arabicText,
    });

    return {
      surahNumber: input.surahNumber,
      ayahNumber: input.ayahNumber,
      referenceText: ayah.arabicText,
      normalizedRecited: normalizeArabic(input.recitedText),
      detectedMistakes,
      mistakeSummary: this.detector.summarize(detectedMistakes),
    };
  }
}
