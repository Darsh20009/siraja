import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranBookmarkRepository,
  QURAN_BOOKMARK_REPOSITORY,
} from '../../domain/repositories/quran-bookmark.repository.interface';

@Injectable()
export class GetLastReadUseCase {
  constructor(
    @Inject(QURAN_BOOKMARK_REPOSITORY) private readonly bookmarkRepository: IQuranBookmarkRepository,
  ) {}

  execute(tenantId: string, userId: string) {
    return this.bookmarkRepository.getLastRead(tenantId, userId);
  }
}
