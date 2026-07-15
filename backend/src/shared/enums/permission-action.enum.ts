/**
 * Permission actions — the operations a permission key can grant against
 * a category. Not every action is meaningful for every category; the
 * valid (category, action) pairs are defined once in
 * `shared/authorization/permission-registry.ts`, not here.
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  AWARD = 'award',   // Phase 12D — manually award badges/achievements
  RESOLVE = 'resolve', // Phase 12E — resolve tickets / alerts
  VOTE = 'vote',       // Phase 12E — vote on feature requests
}
