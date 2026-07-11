import { Module } from '@nestjs/common';
import { AyahsModule } from '@modules/ayahs/ayahs.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { AyahNotesModule } from '@modules/ayah-notes/ayah-notes.module';
import { MistakesModule } from '@modules/mistakes/mistakes.module';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { GetSmartMushafViewUseCase } from './application/use-cases/get-smart-mushaf-view.use-case';
import { SmartMushafController } from './infrastructure/controllers/smart-mushaf.controller';

/**
 * Smart Mushaf Module — Phase 9 facade.
 * No schema of its own; composes AyahsModule, AyahPerformanceModule,
 * AyahNotesModule, and MistakesModule into the single per-surah view.
 */
@Module({
  imports: [AyahsModule, AyahPerformanceModule, AyahNotesModule, MistakesModule, StudentsModule, SheikhsModule, ParentsModule],
  controllers: [SmartMushafController],
  providers: [GetSmartMushafViewUseCase],
})
export class SmartMushafModule {}
