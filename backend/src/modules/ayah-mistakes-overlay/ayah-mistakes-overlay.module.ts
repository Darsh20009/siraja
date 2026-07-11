import { Module } from '@nestjs/common';
import { MistakesModule } from '@modules/mistakes/mistakes.module';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { GetMistakesOverlayUseCase } from './application/use-cases/get-mistakes-overlay.use-case';
import { AyahMistakesOverlayController } from './infrastructure/controllers/ayah-mistakes-overlay.controller';

/**
 * Ayah Mistakes Overlay Module — Phase 9 (Smart Mushaf Engine).
 * No schema of its own; reads Phase 7's `quran_mistakes` collection via
 * `MistakesModule`'s exported repository token.
 */
@Module({
  imports: [MistakesModule, StudentsModule, SheikhsModule, ParentsModule],
  controllers: [AyahMistakesOverlayController],
  providers: [GetMistakesOverlayUseCase],
})
export class AyahMistakesOverlayModule {}
