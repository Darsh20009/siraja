import { Inject, Injectable } from '@nestjs/common';
import { ISurahRepository, SURAH_REPOSITORY } from '../../domain/repositories/surah.repository.interface';

@Injectable()
export class ListSurahsUseCase {
  constructor(@Inject(SURAH_REPOSITORY) private readonly surahRepository: ISurahRepository) {}

  execute(query?: string) {
    return query ? this.surahRepository.searchByName(query) : this.surahRepository.findAll();
  }
}
