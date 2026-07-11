import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSIGNMENT_REPOSITORY, IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { AssignmentStatus } from '@shared/enums/exam-assignment.enum';
import { Role } from '@shared/enums/roles.enum';

/**
 * SubmitAssignmentUseCase
 *
 * Marks an assignment as submitted.
 *
 * Allowed callers (explicit allowlist — fail closed for all others):
 *   STUDENT      → may only submit their own assignment (studentId match)
 *   SHEIKH       → may only submit assignments they issued or that are in their circles
 *   TENANT_ADMIN → unrestricted
 *
 * PARENT and SUPERVISOR are explicitly denied — they read but cannot submit.
 */
@Injectable()
export class SubmitAssignmentUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: SubmitAssignmentDto) {
    const assignment = await this.assignmentRepo.findById(user.tenantId, id);
    if (!assignment) throw new NotFoundException('Assignment not found.');

    if (assignment.status === AssignmentStatus.REVIEWED) {
      throw new BadRequestException('Assignment has already been reviewed.');
    }

    const roles = user.roles as Role[];

    // TENANT_ADMIN: unrestricted
    if (roles.includes(Role.TENANT_ADMIN)) {
      return this.doSubmit(user.tenantId, id, dto);
    }

    // STUDENT: may only submit their own assignment
    if (roles.includes(Role.STUDENT)) {
      const student = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!student) throw new ForbiddenException('Student profile not found.');
      if (student.id !== assignment.studentId) {
        throw new ForbiddenException('Students may only submit their own assignments.');
      }
      return this.doSubmit(user.tenantId, id, dto);
    }

    // SHEIKH: may only submit assignments they issued or for their circles
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigner = assignment.assignedById === user.sub;
      const inCircle = assignment.groupId != null && sheikh.groupIds.includes(assignment.groupId);
      if (!isAssigner && !inCircle) {
        throw new ForbiddenException('Sheikhs may only submit assignments they issued or for their circles.');
      }
      return this.doSubmit(user.tenantId, id, dto);
    }

    // All other roles (PARENT, SUPERVISOR, etc.) are denied
    throw new ForbiddenException('You do not have permission to submit this assignment.');
  }

  private doSubmit(tenantId: string, id: string, dto: SubmitAssignmentDto) {
    return this.assignmentRepo.submit(tenantId, id, {
      submittedAt: new Date(),
      submissionNotes: dto.submissionNotes,
    });
  }
}
