import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IOwnershipResolver,
  OwnershipCheckParams,
} from '@core/domain/authorization/ownership-resolver.interface';
import { ResourceType } from '@shared/enums/resource-type.enum';
import { Role } from '@shared/enums/roles.enum';
import { User, UserDocument } from '@database/mongoose/schemas/user.schema';
import { Student, StudentDocument } from '@database/mongoose/schemas/student.schema';
import { Parent, ParentDocument } from '@database/mongoose/schemas/parent.schema';
import { Sheikh, SheikhDocument } from '@database/mongoose/schemas/sheikh.schema';
import { Supervisor, SupervisorDocument } from '@database/mongoose/schemas/supervisor.schema';
import { Group, GroupDocument } from '@database/mongoose/schemas/group.schema';
import { Session, SessionDocument } from '@database/mongoose/schemas/session.schema';
import { Attendance, AttendanceDocument } from '@database/mongoose/schemas/attendance.schema';
import {
  MemorizationRecord,
  MemorizationRecordDocument,
} from '@database/mongoose/schemas/memorization-record.schema';
import {
  ReviewRecord,
  ReviewRecordDocument,
} from '@database/mongoose/schemas/review-record.schema';
import { Exam, ExamDocument } from '@database/mongoose/schemas/exam.schema';
import { Assignment, AssignmentDocument } from '@database/mongoose/schemas/assignment.schema';

/** The subset of context needed to evaluate a role-specific ownership rule. */
interface ResolvedTarget {
  /** The Student._id this resource ultimately belongs to, if any. */
  studentId?: string;
  /** The Group._id this resource ultimately belongs to, if any. */
  groupId?: string;
  /** The User._id this resource IS (for `user`/`sheikh`/`parent`/`supervisor` resource types). */
  ownerUserId?: string;
}

/**
 * Mongoose-backed implementation of `IOwnershipResolver`.
 *
 * Every resource type is first reduced to a small `ResolvedTarget`
 * (which student / which group / which user it ultimately belongs to),
 * then a single role-dispatch table (`evaluate`) decides ownership from
 * that target — so adding a new resource type only requires writing its
 * `resolveTarget` case, not re-deriving the per-role rules.
 *
 * `SUPER_ADMIN` and `TENANT_ADMIN` are never routed here — see
 * `ResourceOwnershipGuard`, which short-circuits both before calling this
 * resolver, per the "Tenant Admin controls his whole tenant" rule.
 */
@Injectable()
export class OwnershipResolverService implements IOwnershipResolver {
  private readonly logger = new Logger(OwnershipResolverService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Parent.name) private readonly parentModel: Model<ParentDocument>,
    @InjectModel(Sheikh.name) private readonly sheikhModel: Model<SheikhDocument>,
    @InjectModel(Supervisor.name) private readonly supervisorModel: Model<SupervisorDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(MemorizationRecord.name)
    private readonly memorizationModel: Model<MemorizationRecordDocument>,
    @InjectModel(ReviewRecord.name) private readonly reviewModel: Model<ReviewRecordDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<ExamDocument>,
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
  ) {}

  async isOwner(params: OwnershipCheckParams): Promise<boolean> {
    const target = await this.resolveTarget(params);
    if (!target) {
      // Resource not found (or not in this tenant) — deny, never assume.
      this.logger.warn(
        `Ownership check found no ${params.resourceType} "${params.resourceId}" in tenant "${params.tenantId}"`,
      );
      return false;
    }
    return this.evaluate(params, target);
  }

  private async resolveTarget(params: OwnershipCheckParams): Promise<ResolvedTarget | null> {
    const { tenantId, resourceType, resourceId } = params;
    const filter = { _id: resourceId, tenantId, isDeleted: false };

    switch (resourceType) {
      case ResourceType.STUDENT: {
        const doc = await this.studentModel.findOne(filter).select('user group').lean();
        if (!doc) return null;
        return { studentId: String(doc._id), groupId: doc.group ? String(doc.group) : undefined, ownerUserId: String(doc.user) };
      }
      case ResourceType.PARENT: {
        const doc = await this.parentModel.findOne(filter).select('user').lean();
        return doc ? { ownerUserId: String(doc.user) } : null;
      }
      case ResourceType.SHEIKH: {
        const doc = await this.sheikhModel.findOne(filter).select('user').lean();
        return doc ? { ownerUserId: String(doc.user) } : null;
      }
      case ResourceType.SUPERVISOR: {
        const doc = await this.supervisorModel.findOne(filter).select('user').lean();
        return doc ? { ownerUserId: String(doc.user) } : null;
      }
      case ResourceType.USER: {
        // Ownership of a User document itself means "is this your own
        // account" — verify it actually exists in this tenant first, so
        // a fabricated/deleted/cross-tenant id fails closed rather than
        // accidentally matching on string equality alone.
        const doc = await this.userModel.findOne(filter).select('_id').lean();
        return doc ? { ownerUserId: String(doc._id) } : null;
      }
      case ResourceType.GROUP: {
        const doc = await this.groupModel.findOne(filter).select('_id').lean();
        return doc ? { groupId: String(doc._id) } : null;
      }
      case ResourceType.SESSION: {
        const doc = await this.sessionModel.findOne(filter).select('group').lean();
        return doc ? { groupId: String(doc.group) } : null;
      }
      case ResourceType.ATTENDANCE: {
        const doc = await this.attendanceModel.findOne(filter).select('student').lean();
        if (!doc) return null;
        return this.viaStudent(tenantId, String(doc.student));
      }
      case ResourceType.MEMORIZATION_RECORD: {
        const doc = await this.memorizationModel.findOne(filter).select('student').lean();
        if (!doc) return null;
        return this.viaStudent(tenantId, String(doc.student));
      }
      case ResourceType.REVIEW_RECORD: {
        const doc = await this.reviewModel.findOne(filter).select('student').lean();
        if (!doc) return null;
        return this.viaStudent(tenantId, String(doc.student));
      }
      case ResourceType.EXAM: {
        const doc = await this.examModel.findOne(filter).select('student group').lean();
        if (!doc) return null;
        return { studentId: String(doc.student), groupId: doc.group ? String(doc.group) : undefined };
      }
      case ResourceType.ASSIGNMENT: {
        const doc = await this.assignmentModel.findOne(filter).select('student group').lean();
        if (!doc) return null;
        return { studentId: String(doc.student), groupId: doc.group ? String(doc.group) : undefined };
      }
      default:
        return null;
    }
  }

  /** Resolves a bare student id into a full target (studentId + its group). */
  private async viaStudent(tenantId: string, studentId: string): Promise<ResolvedTarget | null> {
    const student = await this.studentModel
      .findOne({ _id: studentId, tenantId, isDeleted: false })
      .select('group')
      .lean();
    if (!student) return null;
    return { studentId, groupId: student.group ? String(student.group) : undefined };
  }

  /**
   * Role-specific ownership rules — see
   * docs/architecture/09-authorization-blueprint.md §4 "Ownership Rules"
   * for the plain-language version of each branch below.
   */
  private async evaluate(params: OwnershipCheckParams, target: ResolvedTarget): Promise<boolean> {
    // A user holding multiple roles owns the resource if ANY of their
    // roles satisfies that role's rule (e.g. a Sheikh who is also a
    // Supervisor owns a resource via either assignment path).
    for (const role of params.roles) {
      if (await this.evaluateForRole(role, params, target)) return true;
    }
    return false;
  }

  private async evaluateForRole(
    role: Role,
    params: OwnershipCheckParams,
    target: ResolvedTarget,
  ): Promise<boolean> {
    const { userId, tenantId } = params;

    switch (role) {
      case Role.STUDENT: {
        // Students only access their own data.
        if (target.ownerUserId) return target.ownerUserId === userId;
        if (!target.studentId) return false;
        const own = await this.studentModel
          .findOne({ tenantId, user: new Types.ObjectId(userId), isDeleted: false })
          .select('_id')
          .lean();
        return !!own && String(own._id) === target.studentId;
      }

      case Role.PARENT: {
        // Parents only access their linked children.
        if (!target.studentId) return false;
        const parent = await this.parentModel
          .findOne({ tenantId, user: new Types.ObjectId(userId), isDeleted: false })
          .select('students user')
          .lean();
        if (!parent) return false;
        if (target.ownerUserId && target.ownerUserId === String(parent.user)) return true; // own parent profile
        return parent.students.some((studentRef) => String(studentRef) === target.studentId);
      }

      case Role.SHEIKH: {
        // Sheikhs only access students/groups/sessions they are assigned to teach.
        const sheikh = await this.sheikhModel
          .findOne({ tenantId, user: new Types.ObjectId(userId), isDeleted: false })
          .select('groups user')
          .lean();
        if (!sheikh) return false;
        if (target.ownerUserId && target.ownerUserId === String(sheikh.user)) return true; // own sheikh profile
        if (!target.groupId) return false;
        return sheikh.groups.some((groupRef) => String(groupRef) === target.groupId);
      }

      case Role.SUPERVISOR: {
        // Supervisors only access groups (and everything under them) they supervise.
        const supervisor = await this.supervisorModel
          .findOne({ tenantId, user: new Types.ObjectId(userId), isDeleted: false })
          .select('supervisedGroups user')
          .lean();
        if (!supervisor) return false;
        if (target.ownerUserId && target.ownerUserId === String(supervisor.user)) return true; // own supervisor profile
        if (!target.groupId) return false;
        return supervisor.supervisedGroups.some((groupRef) => String(groupRef) === target.groupId);
      }

      // SUPER_ADMIN / TENANT_ADMIN never reach this resolver — see
      // ResourceOwnershipGuard, which bypasses them beforehand.
      default:
        return false;
    }
  }
}
