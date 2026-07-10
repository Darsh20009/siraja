import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuranNote, QuranNoteSchema } from '@database/mongoose/schemas';
import { QURAN_NOTE_REPOSITORY } from './domain/repositories/quran-note.repository.interface';
import { QuranNoteRepository } from './infrastructure/repositories/quran-note.repository';
import { CreateNoteUseCase } from './application/use-cases/create-note.use-case';
import { ListNotesUseCase } from './application/use-cases/list-notes.use-case';
import { UpdateNoteUseCase } from './application/use-cases/update-note.use-case';
import { DeleteNoteUseCase } from './application/use-cases/delete-note.use-case';
import { QuranNotesController } from './infrastructure/controllers/quran-notes.controller';

/** Quran Notes Module — Phase 5. Owns `quran_notes` (tenant + user scoped). */
@Module({
  imports: [MongooseModule.forFeature([{ name: QuranNote.name, schema: QuranNoteSchema }])],
  controllers: [QuranNotesController],
  providers: [
    { provide: QURAN_NOTE_REPOSITORY, useClass: QuranNoteRepository },
    CreateNoteUseCase,
    ListNotesUseCase,
    UpdateNoteUseCase,
    DeleteNoteUseCase,
  ],
})
export class QuranNotesModule {}
