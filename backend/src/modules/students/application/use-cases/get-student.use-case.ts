import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class GetStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
  ) {}

  async execute(tenantId: string, studentId: string, requester: AccessTokenPayload) {
    const student = await this.studentRepo.findById(tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = requester.roles as Role[];

    // TENANT_ADMIN and SUPERVISOR: unrestricted read within tenant
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return student;
    }

    // STUDENT: only own profile
    if (roles.includes(Role.STUDENT)) {
      if (student.userId !== requester.sub) {
        throw new ForbiddenException('Students may only access their own profile.');
      }
      return student;
    }

    // SHEIKH: only students in their assigned circles or direct assignment
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(tenantId, requester.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        (student.groupId && sheikh.groupIds.includes(student.groupId)) ||
        student.sheikhId === sheikh.id;
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only access assigned students.');
      return student;
    }

    // PARENT: only linked children
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(tenantId, requester.sub);
      if (!parent) throw new ForbiddenException('Parent profile not found.');
      if (!parent.studentIds.includes(studentId)) {
        throw new ForbiddenException('Parents may only access linked children.');
      }
      return student;
    }

    throw new ForbiddenException();
  }
}
