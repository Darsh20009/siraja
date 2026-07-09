export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  EXPORT = 'export',
}

export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  SUPER_ADMIN = 'super_admin',
}
