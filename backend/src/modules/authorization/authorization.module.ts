import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '@database/mongoose/schemas/user.schema';
import { Role, RoleSchema } from '@database/mongoose/schemas/role.schema';
import {
  UserPermission,
  UserPermissionSchema,
} from '@database/mongoose/schemas/user-permission.schema';
import { Permission, PermissionSchema } from '@database/mongoose/schemas/permission.schema';
import { Student, StudentSchema } from '@database/mongoose/schemas/student.schema';
import { Parent, ParentSchema } from '@database/mongoose/schemas/parent.schema';
import { Sheikh, SheikhSchema } from '@database/mongoose/schemas/sheikh.schema';
import { Supervisor, SupervisorSchema } from '@database/mongoose/schemas/supervisor.schema';
import { Group, GroupSchema } from '@database/mongoose/schemas/group.schema';
import { Session, SessionSchema } from '@database/mongoose/schemas/session.schema';
import { Attendance, AttendanceSchema } from '@database/mongoose/schemas/attendance.schema';
import {
  MemorizationRecord,
  MemorizationRecordSchema,
} from '@database/mongoose/schemas/memorization-record.schema';
import {
  ReviewRecord,
  ReviewRecordSchema,
} from '@database/mongoose/schemas/review-record.schema';
import { Exam, ExamSchema } from '@database/mongoose/schemas/exam.schema';
import { Assignment, AssignmentSchema } from '@database/mongoose/schemas/assignment.schema';

import { PERMISSION_RESOLVER } from '@core/domain/authorization/permission-resolver.interface';
import { OWNERSHIP_RESOLVER } from '@core/domain/authorization/ownership-resolver.interface';
import { PermissionResolverService } from '@core/infrastructure/authorization/permission-resolver.service';
import { OwnershipResolverService } from '@core/infrastructure/authorization/ownership-resolver.service';
import { PermissionContext } from '@core/infrastructure/authorization/permission-context';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ResourceOwnershipGuard } from '../../common/guards/resource-ownership.guard';

import { PermissionSeeder } from '@database/seeders/permission.seeder';

/**
 * Authorization Module — Phase 3.
 *
 * `@Global()` because every other feature module needs the permission
 * decorators/guards without re-importing this module explicitly (the
 * same rationale `TenancyModule`-style infrastructure follows).
 *
 * Registers the full guard chain as global `APP_GUARD`s, in the fixed
 * order they must run (Nest applies `APP_GUARD` providers in
 * registration order):
 *
 *   1. JwtAuthGuard          — authenticates, populates `request.user`
 *   2. RolesGuard            — coarse @Roles() check (Phase 1)
 *   3. PermissionsGuard      — fine-grained @RequirePermissions() check,
 *                              Super Admin bypass lives here
 *   4. TenantScopeGuard      — "Tenant Admin only controls his own tenant"
 *   5. ResourceOwnershipGuard — @CheckOwnership() per-instance rule
 *
 * No controllers — this module exposes authorization *plumbing* only,
 * per Phase 3's "architecture only, no APIs" instruction.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: UserPermission.name, schema: UserPermissionSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Parent.name, schema: ParentSchema },
      { name: Sheikh.name, schema: SheikhSchema },
      { name: Supervisor.name, schema: SupervisorSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: MemorizationRecord.name, schema: MemorizationRecordSchema },
      { name: ReviewRecord.name, schema: ReviewRecordSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Assignment.name, schema: AssignmentSchema },
    ]),
  ],
  providers: [
    PermissionContext,
    { provide: PERMISSION_RESOLVER, useClass: PermissionResolverService },
    { provide: OWNERSHIP_RESOLVER, useClass: OwnershipResolverService },
    PermissionSeeder,

    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: TenantScopeGuard },
    { provide: APP_GUARD, useClass: ResourceOwnershipGuard },
  ],
  exports: [PERMISSION_RESOLVER, OWNERSHIP_RESOLVER, PermissionContext, PermissionSeeder],
})
export class AuthorizationModule {}
