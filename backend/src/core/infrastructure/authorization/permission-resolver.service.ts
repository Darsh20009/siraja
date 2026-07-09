import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EffectivePermissions,
  IPermissionResolver,
} from '@core/domain/authorization/permission-resolver.interface';
import { Role } from '@shared/enums/roles.enum';
import { ROLE_PERMISSION_MATRIX } from '@shared/authorization/role-permission.matrix';
import { User, UserDocument } from '@database/mongoose/schemas/user.schema';
import { Role as RoleModel, RoleDocument } from '@database/mongoose/schemas/role.schema';
import {
  UserPermission,
  UserPermissionDocument,
} from '@database/mongoose/schemas/user-permission.schema';

/**
 * Mongoose-backed implementation of `IPermissionResolver`.
 *
 * Resolution precedence (see interface doc for rationale):
 *   1. Union of ROLE_PERMISSION_MATRIX[role] for every role in
 *      `User.roles` (a user may legitimately hold more than one role,
 *      e.g. Sheikh + Supervisor — every held role contributes its
 *      permissions to the union).
 *   2. Tenant-scoped `Role` documents whose `name` matches one of the
 *      user's roles contribute their `permissionKeys` too, so a tenant
 *      admin who edits a system role's grants (or defines a custom role)
 *      is respected without redeploying the matrix.
 *   3. `UserPermission` direct grants add; direct revocations remove —
 *      revocation always wins, applied last.
 *
 * This is authorization infrastructure (reading who-can-do-what), not
 * application business logic — no domain rules about students, sessions,
 * billing, etc. live here.
 */
@Injectable()
export class PermissionResolverService implements IPermissionResolver {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RoleModel.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(UserPermission.name)
    private readonly userPermissionModel: Model<UserPermissionDocument>,
  ) {}

  async resolveForUser(userId: string, tenantId: string): Promise<EffectivePermissions> {
    const user = await this.userModel
      .findOne({ _id: userId, tenantId, isDeleted: false })
      .select('roles')
      .lean();

    if (!user) {
      return { userId, tenantId, isSuperAdmin: false, roles: [], permissionKeys: new Set() };
    }

    const roles: Role[] = user.roles ?? [];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    if (isSuperAdmin) {
      // Bypass path — see PermissionsGuard. The set is intentionally
      // left empty; SUPER_ADMIN is never checked against it.
      return { userId, tenantId, isSuperAdmin: true, roles, permissionKeys: new Set() };
    }

    const permissionKeys = new Set<string>();

    // 1. System role matrix.
    for (const role of roles) {
      for (const key of ROLE_PERMISSION_MATRIX[role] ?? []) {
        permissionKeys.add(key);
      }
    }

    // 2. Tenant-defined Role documents (system role overrides + custom roles).
    const tenantRoles = await this.roleModel
      .find({ tenantId, name: { $in: roles }, isDeleted: false })
      .select('permissionKeys')
      .lean();
    for (const roleDoc of tenantRoles) {
      for (const key of roleDoc.permissionKeys ?? []) {
        permissionKeys.add(key);
      }
    }

    // 3. Direct per-user overrides — revocation applied last, always wins.
    const overrides = await this.userPermissionModel
      .find({ tenantId, user: new Types.ObjectId(userId), isDeleted: false })
      .select('permissionKey isGranted')
      .lean();
    for (const override of overrides) {
      if (override.isGranted) {
        permissionKeys.add(override.permissionKey);
      } else {
        permissionKeys.delete(override.permissionKey);
      }
    }

    return { userId, tenantId, isSuperAdmin: false, roles, permissionKeys };
  }

  hasPermissions(
    effective: EffectivePermissions,
    requiredKeys: string[],
    match: 'ALL' | 'ANY',
  ): boolean {
    if (effective.isSuperAdmin) return true;
    if (requiredKeys.length === 0) return true;
    return match === 'ALL'
      ? requiredKeys.every((key) => effective.permissionKeys.has(key))
      : requiredKeys.some((key) => effective.permissionKeys.has(key));
  }
}
