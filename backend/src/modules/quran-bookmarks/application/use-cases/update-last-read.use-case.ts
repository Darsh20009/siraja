import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranBookmarkRepository,
  QURAN_BOOKMARK_REPOSITORY,
} from '../../domain/repositories/quran-bookmark.repository.interface';
import { UpdateLastReadDto } from '../dto/update-last-read.dto';

@Injectable()
export class UpdateLastReadUseCase {
  constructor(
    @Inject(QURAN_BOOKMARK_REPOSITORY) private readonly bookmarkRepository: IQuranBookmarkRepository,
  ) {}

  execute(tenantId: string, userId: string, dto: UpdateLastReadDto) {
    return this.bookmarkRepository.upsertLastRead(tenantId, userId, dto);
  }
}
