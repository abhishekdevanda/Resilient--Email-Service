import type { Email, EmailProvider, ProviderSendResult } from '../interfaces/emails.interfaces';

export class MockProvider2 implements EmailProvider {
  private failureRate: number;
  private providerName: string = 'MockProvider2';

  constructor(failureRate: number = 0.4) {
    this.failureRate = failureRate;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  name(): string {
    return this.providerName;
  }

  async send(email: Email): Promise<ProviderSendResult> {
    // Simulate network delay
    await this.delay(100);

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      return {
        success: false,
        error: `${this.name()} temporarily unavailable`,
      };
    }
    return {
      success: true,
    };
  }
}