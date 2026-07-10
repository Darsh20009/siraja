import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateNoteUseCase } from '../../application/use-cases/create-note.use-case';
import { ListNotesUseCase } from '../../application/use-cases/list-notes.use-case';
import { UpdateNoteUseCase } from '../../application/use-cases/update-note.use-case';
import { DeleteNoteUseCase } from '../../application/use-cases/delete-note.use-case';
import { CreateNoteDto } from '../../application/dto/create-note.dto';
import { UpdateNoteDto } from '../../application/dto/update-note.dto';

/**
 * Quran Notes Module — personal Ayah/Surah-scoped notes. Ownership is
 * enforced by scoping every repository call to `@CurrentUser()`
 * `(tenantId, userId)` directly (see `DeleteBookmarkUseCase` for the
 * rationale shared with Bookmarks).
 */
@Controller('quran/notes')
export class QuranNotesController {
  constructor(
    private readonly createNoteUseCase: CreateNoteUseCase,
    private readonly listNotesUseCase: ListNotesUseCase,
    private readonly updateNoteUseCase: UpdateNoteUseCase,
    private readonly deleteNoteUseCase: DeleteNoteUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.QURAN_NOTES.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateNoteDto) {
    return this.createNoteUseCase.execute(user.tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.QURAN_NOTES.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listNotesUseCase.execute(user.tenantId, user.sub);
  }

  @Patch(':noteId')
  @RequirePermissions(PERMISSIONS.QURAN_NOTES.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.updateNoteUseCase.execute(user.tenantId, user.sub, noteId, dto);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.QURAN_NOTES.DELETE!)
  delete(@CurrentUser() user: AccessTokenPayload, @Param('noteId') noteId: string) {
    return this.deleteNoteUseCase.execute(user.tenantId, user.sub, noteId);
  }
}
