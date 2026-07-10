import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateBookmarkUseCase } from '../../application/use-cases/create-bookmark.use-case';
import { ListBookmarksUseCase } from '../../application/use-cases/list-bookmarks.use-case';
import { DeleteBookmarkUseCase } from '../../application/use-cases/delete-bookmark.use-case';
import { UpdateLastReadUseCase } from '../../application/use-cases/update-last-read.use-case';
import { GetLastReadUseCase } from '../../application/use-cases/get-last-read.use-case';
import { CreateBookmarkDto } from '../../application/dto/create-bookmark.dto';
import { ListBookmarksQueryDto } from '../../application/dto/list-bookmarks-query.dto';
import { UpdateLastReadDto } from '../../application/dto/update-last-read.dto';

/**
 * Quran Bookmarks Module — "User Bookmarks", "Favorite Ayahs" (both via
 * `QuranBookmark`, distinguished by `type`), and "Last Read Position"
 * (`QuranLastRead`, a single auto-tracked record per user).
 *
 * Every route is scoped to `@CurrentUser()` — there is no admin/teacher
 * view of another user's bookmarks by design (personal data).
 */
@Controller('quran/bookmarks')
export class QuranBookmarksController {
  constructor(
    private readonly createBookmarkUseCase: CreateBookmarkUseCase,
    private readonly listBookmarksUseCase: ListBookmarksUseCase,
    private readonly deleteBookmarkUseCase: DeleteBookmarkUseCase,
    private readonly updateLastReadUseCase: UpdateLastReadUseCase,
    private readonly getLastReadUseCase: GetLastReadUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.QURAN_BOOKMARKS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateBookmarkDto) {
    return this.createBookmarkUseCase.execute(user.tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.QURAN_BOOKMARKS.READ!)
  list(@CurrentUser() user: AccessTokenPayload, @Query() query: ListBookmarksQueryDto) {
    return this.listBookmarksUseCase.execute(user.tenantId, user.sub, query.type);
  }

  @Delete(':bookmarkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.QURAN_BOOKMARKS.DELETE!)
  delete(@CurrentUser() user: AccessTokenPayload, @Param('bookmarkId') bookmarkId: string) {
    return this.deleteBookmarkUseCase.execute(user.tenantId, user.sub, bookmarkId);
  }

  @Put('last-read')
  @RequirePermissions(PERMISSIONS.QURAN_BOOKMARKS.UPDATE!)
  updateLastRead(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateLastReadDto) {
    return this.updateLastReadUseCase.execute(user.tenantId, user.sub, dto);
  }

  @Get('last-read')
  @RequirePermissions(PERMISSIONS.QURAN_BOOKMARKS.READ!)
  getLastRead(@CurrentUser() user: AccessTokenPayload) {
    return this.getLastReadUseCase.execute(user.tenantId, user.sub);
  }
}
