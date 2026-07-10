import { Inject, Injectable } from '@nestjs/common';
import { AYAH_REPOSITORY, IAyahRepository } from '../../domain/repositories/ayah.repository.interface';

@Injectable()
export class GetAyahsByJuzUseCase {
  constructor(@Inject(AYAH_REPOSITORY) private readonly ayahRepository: IAyahRepository) {}

  execute(juzNumber: number) {
    return this.ayahRepository.findByJuz(juzNumber);
  }
}
