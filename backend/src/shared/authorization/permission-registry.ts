import { PermissionCategory } from '@shared/enums/permission-category.enum';
import { PermissionAction } from '@shared/enums/permission-action.enum';

/**
 * THE PERMISSION REGISTRY
 * ========================
 * Single source of truth for every valid permission key in the system.
 * A permission key has the shape `<category>.<action>` (e.g.
 * `students.create`, `reports.export`, `groups.assign`).
 *
 * Nothing else in the codebase should hand-write a permission key string
 * — always reference `PERMISSIONS.<CATEGORY>.<ACTION>` or iterate
 * `PERMISSION_REGISTRY`. This is what `PermissionSeeder` seeds into the
 * `permissions` collection (Phase 2), and what `RolePermissionMatrix`
 * and `@RequirePermissions()` call sites draw their keys from.
 *
 * Not every (category, action) pair is meaningful — e.g. `billing.create`
 * or `settings.delete` don't correspond to real operations. The map below
 * is the deliberate, curated list of pairs that exist; anything not
 * listed here is not a valid permission and `assertValidPermissionKey`
 * will throw if referenced.
 */
const CATEGORY_ACTIONS: Record<PermissionCategory, PermissionAction[]> = {
  [PermissionCategory.USERS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  [PermissionCategory.STUDENTS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.EXPORT,
  ],
  [PermissionCategory.PARENTS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  [PermissionCategory.SHEIKHS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.ASSIGN, // assign a sheikh to a group
  ],
  [PermissionCategory.SUPERVISORS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.ASSIGN, // assign a supervisor to a group
  ],
  [PermissionCategory.GROUPS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.ASSIGN, // assign a student into a group
  ],
  [PermissionCategory.SESSIONS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  [PermissionCategory.ATTENDANCE]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.EXPORT,
  ],
  [PermissionCategory.MEMORIZATION]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.APPROVE, // sheikh grades/finalizes an evaluation
  ],
  [PermissionCategory.REVIEWS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.APPROVE,
  ],
  [PermissionCategory.EXAMS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.APPROVE, // finalize a grade
  ],
  [PermissionCategory.ASSIGNMENTS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.APPROVE, // mark reviewed/graded
  ],
  [PermissionCategory.NOTIFICATIONS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.DELETE,
  ],
  [PermissionCategory.REPORTS]: [PermissionAction.READ, PermissionAction.EXPORT],
  [PermissionCategory.SUPPORT]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.APPROVE, // close/resolve a ticket
  ],
  [PermissionCategory.BILLING]: [
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.EXPORT,
    PermissionAction.APPROVE, // approve a plan/payment change
  ],
  [PermissionCategory.AI]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.APPROVE, // accept an AI report into the record
  ],
  [PermissionCategory.SETTINGS]: [PermissionAction.READ, PermissionAction.UPDATE],

  // Quran content (Surahs/Ayahs/Tafsir/metadata/search) is shared,
  // platform-global reference data — everyone with an authenticated
  // session can READ it; CREATE/UPDATE/DELETE is reserved for platform
  // content curation (Super Admin / Tenant Admin only, see the matrix).
  [PermissionCategory.QURAN]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  // Bookmarks/Notes are personal, user-owned data — every role manages
  // its own; ownership is enforced in the use case itself (always
  // scoped to `request.user.sub`), not via `ResourceOwnershipGuard`.
  [PermissionCategory.QURAN_BOOKMARKS]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  [PermissionCategory.QURAN_NOTES]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
};

export interface PermissionDefinition {
  /** `<category>.<action>` — the value stored in `permissions.key` (Phase 2). */
  key: string;
  category: PermissionCategory;
  action: PermissionAction;
  /** Human-readable name, seeded into `permissions.name`. */
  name: string;
  /** Seeded into `permissions.module`. */
  module: PermissionCategory;
}

function buildRegistry(): PermissionDefinition[] {
  const definitions: PermissionDefinition[] = [];
  for (const category of Object.values(PermissionCategory)) {
    for (const action of CATEGORY_ACTIONS[category]) {
      definitions.push({
        key: `${category}.${action}`,
        category,
        action,
        name: `${capitalize(action)} ${category}`,
        module: category,
      });
    }
  }
  return definitions;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Every valid permission definition in the system, generated once. */
export const PERMISSION_REGISTRY: readonly PermissionDefinition[] = Object.freeze(buildRegistry());

/** Fast lookup set of every valid permission key, e.g. "students.create". */
export const PERMISSION_KEYS: ReadonlySet<string> = new Set(
  PERMISSION_REGISTRY.map((definition) => definition.key),
);

/**
 * Strongly-typed access to every permission key, grouped by category, so
 * call sites never hand-type a key:
 *   PERMISSIONS.STUDENTS.CREATE === 'students.create'
 */
type PermissionsShape = {
  [C in PermissionCategory as Uppercase<C>]: {
    [A in PermissionAction as Uppercase<A>]?: string;
  };
};

function buildPermissionsConst(): PermissionsShape {
  const result = {} as Record<string, Record<string, string>>;
  for (const definition of PERMISSION_REGISTRY) {
    const categoryKey = definition.category.toUpperCase();
    const actionKey = definition.action.toUpperCase();
    result[categoryKey] = result[categoryKey] ?? {};
    result[categoryKey][actionKey] = definition.key;
  }
  return result as unknown as PermissionsShape;
}

export const PERMISSIONS = buildPermissionsConst();

export function isValidPermissionKey(key: string): boolean {
  return PERMISSION_KEYS.has(key);
}

export function assertValidPermissionKey(key: string): void {
  if (!isValidPermissionKey(key)) {
    throw new Error(
      `Unknown permission key "${key}" — it is not defined in PERMISSION_REGISTRY. ` +
        'Add it to the CATEGORY_ACTIONS map in permission-registry.ts before referencing it.',
    );
  }
}
