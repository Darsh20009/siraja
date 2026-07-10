import { Inject, Injectable } from '@nestjs/common';
import { ITafsirRepository, TAFSIR_REPOSITORY } from '../../domain/repositories/tafsir.repository.interface';

@Injectable()
export class GetTafsirForAyahUseCase {
  constructor(@Inject(TAFSIR_REPOSITORY) private readonly tafsirRepository: ITafsirRepository) {}

  execute(surahNumber: number, ayahNumber: number, source?: string) {
    return this.tafsirRepository.findForAyah(surahNumber, ayahNumber, source);
  }
}
