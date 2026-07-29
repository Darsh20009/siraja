import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import type { AudioSession } from '../../domain/entities/audio-session.entity';

/**
 * GetAudioSessionUseCase — Phase 13B.
 *
 * Returns a single AudioSession with all sub-documents loaded
 * (segments, word alignments, mistakes, tajweed observations).
 *
 * RBAC:
 *   STUDENT         → own sessions only
 *   PARENT          → sessions of their linked children (not yet enforced
 *                     here — parent insight use-case handles that access path)
 *   SHEIKH / SUPERVISOR / TENANT_ADMIN → any session in tenant
 */
@Injectable()
export class GetAudioSessionUseCase {
  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(user: AccessTokenPayload, sessionId: string): Promise<AudioSession> {
    const roles = user.roles as Role[];

    const session = await this.sessionRepo.findByIdWithDetails(user.tenantId, sessionId);
    if (!session) throw new NotFoundException('Audio session not found.');

    // Student ownership check
    if (roles.includes(Role.STUDENT)) {
      const student = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!student || student.id !== session.studentId) {
        throw new ForbiddenException('You can only view your own audio sessions.');
      }
    }

    return session;
  }
}
