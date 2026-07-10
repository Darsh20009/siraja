import { Inject, Injectable } from '@nestjs/common';
import { AYAH_REPOSITORY, IAyahRepository } from '../../domain/repositories/ayah.repository.interface';

@Injectable()
export class ListAyahsBySurahUseCase {
  constructor(@Inject(AYAH_REPOSITORY) private readonly ayahRepository: IAyahRepository) {}

  execute(surahNumber: number) {
    return this.ayahRepository.findBySurah(surahNumber);
  }
}
