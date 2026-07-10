import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  QuranBookmark,
  QuranBookmarkSchema,
  QuranLastRead,
  QuranLastReadSchema,
} from '@database/mongoose/schemas';
import { QURAN_BOOKMARK_REPOSITORY } from './domain/repositories/quran-bookmark.repository.interface';
import { QuranBookmarkRepository } from './infrastructure/repositories/quran-bookmark.repository';
import { CreateBookmarkUseCase } from './application/use-cases/create-bookmark.use-case';
import { ListBookmarksUseCase } from './application/use-cases/list-bookmarks.use-case';
import { DeleteBookmarkUseCase } from './application/use-cases/delete-bookmark.use-case';
import { UpdateLastReadUseCase } from './application/use-cases/update-last-read.use-case';
import { GetLastReadUseCase } from './application/use-cases/get-last-read.use-case';
import { QuranBookmarksController } from './infrastructure/controllers/quran-bookmarks.controller';

/** Quran Bookmarks Module — Phase 5. Owns `quran_bookmarks` and `quran_last_reads` (tenant + user scoped). */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuranBookmark.name, schema: QuranBookmarkSchema },
      { name: QuranLastRead.name, schema: QuranLastReadSchema },
    ]),
  ],
  controllers: [QuranBookmarksController],
  providers: [
    { provide: QURAN_BOOKMARK_REPOSITORY, useClass: QuranBookmarkRepository },
    CreateBookmarkUseCase,
    ListBookmarksUseCase,
    DeleteBookmarkUseCase,
    UpdateLastReadUseCase,
    GetLastReadUseCase,
  ],
})
export class QuranBookmarksModule {}
