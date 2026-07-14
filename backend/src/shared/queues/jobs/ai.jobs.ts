export interface AiInsightJob {
  tenantId: string;
  studentId: string;
  insightType: 'memorization' | 'review' | 'mistake' | 'forecast';
  contextData: Record<string, unknown>;
}

export interface AiWeaknessReportJob {
  tenantId: string;
  studentId: string;
  requestedBy: string; // userId of requester
}

export interface AiForecastExplanationJob {
  tenantId: string;
  studentId: string;
  forecastData: Record<string, unknown>;
}
