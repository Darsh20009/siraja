import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurahRepository, SURAH_REPOSITORY } from '../../domain/repositories/surah.repository.interface';

@Injectable()
export class GetSurahUseCase {
  constructor(@Inject(SURAH_REPOSITORY) private readonly surahRepository: ISurahRepository) {}

  async execute(surahNumber: number) {
    const surah = await this.surahRepository.findByNumber(surahNumber);
    if (!surah) {
      throw new NotFoundException(`Surah ${surahNumber} not found.`);
    }
    return surah;
  }
}
