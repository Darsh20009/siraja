import { Inject, Injectable } from '@nestjs/common';
import { AYAH_REPOSITORY, IAyahRepository } from '../../domain/repositories/ayah.repository.interface';

@Injectable()
export class GetAyahsByPageUseCase {
  constructor(@Inject(AYAH_REPOSITORY) private readonly ayahRepository: IAyahRepository) {}

  execute(pageNumber: number) {
    return this.ayahRepository.findByPage(pageNumber);
  }
}
