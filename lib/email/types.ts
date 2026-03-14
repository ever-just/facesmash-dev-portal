export interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: unknown;
}

export type EmailType =
  | 'welcome'
  | 'team-invite'
  | 'password-reset'
  | 'password-changed'
  | 'api-key-created'
  | 'usage-alert'
  | 'security-alert'
  | 'weekly-digest';

export interface WeeklyDigestStats {
  totalRequests: number;
  uniqueUsers: number;
  averageResponseTime: number;
  errorRate: number;
}
