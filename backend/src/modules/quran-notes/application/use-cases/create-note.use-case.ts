import { Inject, Injectable } from '@nestjs/common';
import {
  IQuranNoteRepository,
  QURAN_NOTE_REPOSITORY,
} from '../../domain/repositories/quran-note.repository.interface';
import { CreateNoteDto } from '../dto/create-note.dto';

@Injectable()
export class CreateNoteUseCase {
  constructor(@Inject(QURAN_NOTE_REPOSITORY) private readonly noteRepository: IQuranNoteRepository) {}

  execute(tenantId: string, userId: string, dto: CreateNoteDto) {
    return this.noteRepository.create({
      tenantId,
      userId,
      scope: dto.scope,
      surahNumber: dto.surahNumber,
      ayahNumber: dto.ayahNumber,
      text: dto.text,
    });
  }
}
