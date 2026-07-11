import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AyahNote, AyahNoteSchema } from '@database/mongoose/schemas';
import { AYAH_NOTE_REPOSITORY } from './domain/repositories/ayah-note.repository.interface';
import { AyahNoteRepository } from './infrastructure/repositories/ayah-note.repository';
import { CreateAyahNoteUseCase } from './application/use-cases/create-ayah-note.use-case';
import { ListAyahNotesUseCase } from './application/use-cases/list-ayah-notes.use-case';
import { UpdateAyahNoteUseCase } from './application/use-cases/update-ayah-note.use-case';
import { DeleteAyahNoteUseCase } from './application/use-cases/delete-ayah-note.use-case';
import { AyahNotesController } from './infrastructure/controllers/ayah-notes.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Ayah Notes Module — Phase 9 (Smart Mushaf Engine).
 *
 * Owns the `ayah_notes` collection — teacher/admin-authored notes about a
 * student's specific ayah. See `AyahNote` schema doc for the distinction
 * from Phase 5's self-owned `quran_notes`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AyahNote.name, schema: AyahNoteSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [AyahNotesController],
  providers: [
    { provide: AYAH_NOTE_REPOSITORY, useClass: AyahNoteRepository },
    CreateAyahNoteUseCase,
    ListAyahNotesUseCase,
    UpdateAyahNoteUseCase,
    DeleteAyahNoteUseCase,
  ],
  exports: [AYAH_NOTE_REPOSITORY],
})
export class AyahNotesModule {}
