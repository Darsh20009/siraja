export interface WelcomeEmailJob {
  to: string;
  fullName: string;
  tenantName: string;
  loginUrl: string;
}

export interface VerificationEmailJob {
  to: string;
  fullName: string;
  tenantName: string;
  verificationUrl: string;
}

export interface PasswordResetEmailJob {
  to: string;
  fullName: string;
  tenantName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface NotificationEmailJob {
  to: string;
  tenantName: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface SystemAlertEmailJob {
  to: string | string[];
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}
