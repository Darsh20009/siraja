import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AYAH_NOTE_REPOSITORY, IAyahNoteRepository } from '../../domain/repositories/ayah-note.repository.interface';
import { UpdateAyahNoteDto } from '../dto/update-ayah-note.dto';
import { Role } from '@shared/enums/roles.enum';

/** Only the note's original author or a Tenant Admin may edit it. */
@Injectable()
export class UpdateAyahNoteUseCase {
  constructor(
    @Inject(AYAH_NOTE_REPOSITORY)
    private readonly noteRepo: IAyahNoteRepository,
  ) {}

  async execute(user: AccessTokenPayload, noteId: string, dto: UpdateAyahNoteDto) {
    const note = await this.noteRepo.findById(user.tenantId, noteId);
    if (!note) throw new NotFoundException('Ayah note not found.');

    const roles = user.roles as Role[];
    if (note.authorId !== user.sub && !roles.includes(Role.TENANT_ADMIN)) {
      throw new ForbiddenException('You may only edit notes you authored.');
    }

    return this.noteRepo.update(user.tenantId, noteId, dto.text);
  }
}
