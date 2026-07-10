import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranBookmarkRepository,
  QURAN_BOOKMARK_REPOSITORY,
} from '../../domain/repositories/quran-bookmark.repository.interface';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';

@Injectable()
export class CreateBookmarkUseCase {
  constructor(
    @Inject(QURAN_BOOKMARK_REPOSITORY) private readonly bookmarkRepository: IQuranBookmarkRepository,
  ) {}

  execute(tenantId: string, userId: string, dto: CreateBookmarkDto) {
    return this.bookmarkRepository.create({
      tenantId,
      userId,
      surahNumber: dto.surahNumber,
      ayahNumber: dto.ayahNumber,
      type: dto.type,
      label: dto.label,
    });
  }
}
