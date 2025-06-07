export interface Email {
  to: string[];
  subject: string;
  body: string;
}

export interface EmailAttemptLog {
  provider: string;
  attemptNumber: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ProviderSendResult {
  success: boolean;
  error?: string;
}

export interface EmailResult {
  overallSuccess: boolean;
  finalProvider: string;
  attempts: EmailAttemptLog[];
  timestamp: Date;
}

export interface EmailProvider {
  name(): string;
  send(email: Email): Promise<ProviderSendResult>;
}