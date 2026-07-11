import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AYAH_NOTE_REPOSITORY, IAyahNoteRepository } from '../../domain/repositories/ayah-note.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { CreateAyahNoteDto } from '../dto/create-ayah-note.dto';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateAyahNoteUseCase — only staff (Sheikh, Tenant Admin) may author
 * teacher notes on a student's ayah. Supervisor is view-only per the
 * Smart Mushaf role matrix, matching Reporting's precedent of Supervisor
 * as an oversight role rather than a content-writing one.
 */
@Injectable()
export class CreateAyahNoteUseCase {
  constructor(
    @Inject(AYAH_NOTE_REPOSITORY)
    private readonly noteRepo: IAyahNoteRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateAyahNoteDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id || (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only add notes for their assigned students.');
    } else if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SHEIKH)) {
      throw new ForbiddenException();
    }

    return this.noteRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      authorId: user.sub,
      surahNumber: dto.surahNumber,
      ayahNumber: dto.ayahNumber,
      text: dto.text,
    });
  }
}
