import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateAyahNoteUseCase } from '../../application/use-cases/create-ayah-note.use-case';
import { ListAyahNotesUseCase } from '../../application/use-cases/list-ayah-notes.use-case';
import { UpdateAyahNoteUseCase } from '../../application/use-cases/update-ayah-note.use-case';
import { DeleteAyahNoteUseCase } from '../../application/use-cases/delete-ayah-note.use-case';
import { CreateAyahNoteDto } from '../../application/dto/create-ayah-note.dto';
import { UpdateAyahNoteDto } from '../../application/dto/update-ayah-note.dto';

/**
 * Ayah Notes API — `/smart-mushaf/notes`
 *
 * Teacher-authored notes on a student's ayah — distinct from the
 * self-owned `/quran/notes` (Phase 5).
 *
 * RBAC summary:
 *  POST   /smart-mushaf/notes                       → SMART_MUSHAF.CREATE (Sheikh, Admin)
 *  GET    /smart-mushaf/notes/students/:studentId    → SMART_MUSHAF.READ  (role-scoped)
 *  PATCH  /smart-mushaf/notes/:noteId                → SMART_MUSHAF.UPDATE (author or Admin)
 *  DELETE /smart-mushaf/notes/:noteId                → SMART_MUSHAF.DELETE (author or Admin)
 */
@Controller('smart-mushaf/notes')
export class AyahNotesController {
  constructor(
    private readonly createNote: CreateAyahNoteUseCase,
    private readonly listNotes: ListAyahNotesUseCase,
    private readonly updateNote: UpdateAyahNoteUseCase,
    private readonly deleteNote: DeleteAyahNoteUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAyahNoteDto) {
    return this.createNote.execute(user, dto);
  }

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('surahNumber') surahNumber?: string,
    @Query('ayahNumber') ayahNumber?: string,
  ) {
    return this.listNotes.execute(
      user,
      studentId,
      surahNumber ? Number(surahNumber) : undefined,
      ayahNumber ? Number(ayahNumber) : undefined,
    );
  }

  @Patch(':noteId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.UPDATE!)
  update(@CurrentUser() user: AccessTokenPayload, @Param('noteId') noteId: string, @Body() dto: UpdateAyahNoteDto) {
    return this.updateNote.execute(user, noteId, dto);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.DELETE!)
  delete(@CurrentUser() user: AccessTokenPayload, @Param('noteId') noteId: string) {
    return this.deleteNote.execute(user, noteId);
  }
}
