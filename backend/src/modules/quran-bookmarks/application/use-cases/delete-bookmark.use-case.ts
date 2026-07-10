import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IQuranBookmarkRepository,
  QURAN_BOOKMARK_REPOSITORY,
} from '../../domain/repositories/quran-bookmark.repository.interface';

/**
 * Ownership is enforced here, not via `ResourceOwnershipGuard` —
 * bookmarks/notes are always strictly self-owned (never assigned to
 * someone by a teacher/supervisor), so every repository call is scoped
 * to `(tenantId, userId)` directly rather than resolved through the
 * generic hierarchical ownership resolver built for student/session/
 * group resources.
 */
@Injectable()
export class DeleteBookmarkUseCase {
  constructor(
    @Inject(QURAN_BOOKMARK_REPOSITORY) private readonly bookmarkRepository: IQuranBookmarkRepository,
  ) {}

  async execute(tenantId: string, userId: string, bookmarkId: string) {
    const bookmark = await this.bookmarkRepository.findOwnedById(tenantId, userId, bookmarkId);
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found.');
    }
    await this.bookmarkRepository.delete(tenantId, userId, bookmarkId);
  }
}
