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
}

export enum SenderType {
  USER = 'user',
  SUPPORT_AGENT = 'support_agent',
  SYSTEM = 'system',
}
