export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACADEMIC = 'academic',
  GENERAL = 'general',
  // Phase 12E additions
  ACCOUNT = 'account',
  CONTENT = 'content',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

/** Phase 12E — waiting for customer response between OPEN and RESOLVED. */
export enum TicketStatusExtended {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SenderType {
  USER = 'user',
  SUPPORT_AGENT = 'support_agent',
  SYSTEM = 'system',
}
