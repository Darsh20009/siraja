import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranNoteRepository,
  QURAN_NOTE_REPOSITORY,
} from '../../domain/repositories/quran-note.repository.interface';
import { UpdateNoteDto } from '../dto/update-note.dto';

@Injectable()
export class UpdateNoteUseCase {
  constructor(@Inject(QURAN_NOTE_REPOSITORY) private readonly noteRepository: IQuranNoteRepository) {}

  execute(tenantId: string, userId: string, noteId: string, dto: UpdateNoteDto) {
    return this.noteRepository.update(tenantId, userId, noteId, dto);
  }
}
