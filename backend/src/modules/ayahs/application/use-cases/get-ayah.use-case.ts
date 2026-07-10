import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AYAH_REPOSITORY, IAyahRepository } from '../../domain/repositories/ayah.repository.interface';

@Injectable()
export class GetAyahUseCase {
  constructor(@Inject(AYAH_REPOSITORY) private readonly ayahRepository: IAyahRepository) {}

  async execute(surahNumber: number, ayahNumber: number) {
    const ayah = await this.ayahRepository.findOne(surahNumber, ayahNumber);
    if (!ayah) {
      throw new NotFoundException(`Ayah ${surahNumber}:${ayahNumber} not found.`);
    }
    return ayah;
  }
}
