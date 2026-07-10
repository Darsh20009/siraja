import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranBookmarkRepository,
  QURAN_BOOKMARK_REPOSITORY,
} from '../../domain/repositories/quran-bookmark.repository.interface';
import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';

@Injectable()
export class ListBookmarksUseCase {
  constructor(
    @Inject(QURAN_BOOKMARK_REPOSITORY) private readonly bookmarkRepository: IQuranBookmarkRepository,
  ) {}

  execute(tenantId: string, userId: string, type?: QuranBookmarkType) {
    return this.bookmarkRepository.findAllForUser(tenantId, userId, type);
  }
}
