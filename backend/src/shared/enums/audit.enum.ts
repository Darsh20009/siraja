export enum AuditAction {
  // Auth events (existing)
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  PERMISSION_CHANGE = 'permission_change',
  EXPORT = 'export',
  REGISTER = 'register',
  EMAIL_VERIFIED = 'email_verified',
  EMAIL_VERIFICATION_REQUESTED = 'email_verification_requested',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REUSE_DETECTED = 'token_reuse_detected',
  DEVICE_REVOKED = 'device_revoked',
  OAUTH_LINKED = 'oauth_linked',
  // Phase 12E — admin operations
  TENANT_CHANGE = 'tenant_change',
  SYSTEM_CHANGE = 'system_change',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
}

export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  SUPER_ADMIN = 'super_admin',
}

/** Phase 12E — entity types written to the audit trail. */
export enum AuditEntityType {
  USER = 'user',
  TENANT = 'tenant',
  ROLE = 'role',
  PERMISSION = 'permission',
  STUDENT = 'student',
  SHEIKH = 'sheikh',
  CIRCLE = 'circle',
  DONATION = 'donation',
  CAMPAIGN = 'campaign',
  TICKET = 'ticket',
  FEATURE_REQUEST = 'feature_request',
  SYSTEM = 'system',
  ALERT = 'alert',
}
