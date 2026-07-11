import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AYAH_REPOSITORY, IAyahRepository } from '@modules/ayahs/domain/repositories/ayah.repository.interface';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';
import { AYAH_NOTE_REPOSITORY, IAyahNoteRepository } from '@modules/ayah-notes/domain/repositories/ayah-note.repository.interface';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '@modules/mistakes/domain/repositories/quran-mistake.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { AyahPerformanceStatus } from '@shared/enums/smart-mushaf.enum';

/**
 * GetSmartMushafViewUseCase — the Smart Mushaf facade (Phase 9).
 *
 * No schema of its own: merges Ayah text (Phase 5, platform-global),
 * per-ayah performance/heatmap (this phase, materialised), teacher notes
 * (this phase), and the mistakes overlay (Phase 7 data, this phase's
 * aggregation) into a single per-surah view for the Mushaf reading
 * screen — mirrors the Reporting module's no-own-schema aggregation
 * pattern (Phase 8).
 */
@Injectable()
export class GetSmartMushafViewUseCase {
  constructor(
    @Inject(AYAH_REPOSITORY)
    private readonly ayahRepo: IAyahRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly performanceRepo: IAyahPerformanceRepository,
    @Inject(AYAH_NOTE_REPOSITORY)
    private readonly noteRepo: IAyahNoteRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY)
    private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, surahNumber: number) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    assertCanAccessStudent(user, student, {
      sheikh: roles.includes(Role.SHEIKH) ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub) : undefined,
      parent: roles.includes(Role.PARENT) ? await this.parentRepo.findByUserId(user.tenantId, user.sub) : undefined,
      ownStudentProfileId: roles.includes(Role.STUDENT)
        ? (await this.studentRepo.findByUserId(user.tenantId, user.sub))?.id ?? null
        : undefined,
    });

    const [ayahs, performance, notes, mistakeOverlay] = await Promise.all([
      this.ayahRepo.findBySurah(surahNumber),
      this.performanceRepo.findByStudent(user.tenantId, studentId, { surahNumber }),
      this.noteRepo.findByStudent(user.tenantId, studentId, { surahNumber }),
      this.mistakeRepo.getOverlayByStudent(user.tenantId, studentId, surahNumber),
    ]);

    const performanceByAyah = new Map(performance.map((p) => [p.ayahNumber, p]));
    const notesByAyah = new Map<number, typeof notes>();
    for (const note of notes) {
      const list = notesByAyah.get(note.ayahNumber) ?? [];
      list.push(note);
      notesByAyah.set(note.ayahNumber, list);
    }
    const mistakesByAyah = new Map(mistakeOverlay.map((m) => [m.ayahNumber, m]));

    return {
      surahNumber,
      ayahs: ayahs.map((ayah) => {
        const perf = performanceByAyah.get(ayah.ayahNumber);
        return {
          ayahNumber: ayah.ayahNumber,
          arabicText: ayah.arabicText,
          pageNumber: ayah.pageNumber,
          juzNumber: ayah.juzNumber,
          performance: {
            status: perf?.status ?? AyahPerformanceStatus.NOT_STARTED,
            confidenceScore: perf?.confidenceScore ?? 0,
            heatmapLevel: perf?.heatmapLevel ?? null,
          },
          notes: notesByAyah.get(ayah.ayahNumber) ?? [],
          mistakes: mistakesByAyah.get(ayah.ayahNumber) ?? null,
        };
      }),
    };
  }
}
