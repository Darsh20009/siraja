import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranNoteRepository,
  QURAN_NOTE_REPOSITORY,
} from '../../domain/repositories/quran-note.repository.interface';

@Injectable()
export class ListNotesUseCase {
  constructor(@Inject(QURAN_NOTE_REPOSITORY) private readonly noteRepository: IQuranNoteRepository) {}

  execute(tenantId: string, userId: string) {
    return this.noteRepository.findAllForUser(tenantId, userId);
  }
}
