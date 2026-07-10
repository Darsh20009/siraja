import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IQuranNoteRepository,
  QURAN_NOTE_REPOSITORY,
} from '../../domain/repositories/quran-note.repository.interface';

@Injectable()
export class DeleteNoteUseCase {
  constructor(@Inject(QURAN_NOTE_REPOSITORY) private readonly noteRepository: IQuranNoteRepository) {}

  async execute(tenantId: string, userId: string, noteId: string) {
    const note = await this.noteRepository.findOwnedById(tenantId, userId, noteId);
    if (!note) {
      throw new NotFoundException('Note not found.');
    }
    await this.noteRepository.delete(tenantId, userId, noteId);
  }
}
