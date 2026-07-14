export interface PushNotificationJob {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface InAppNotificationJob {
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
}
