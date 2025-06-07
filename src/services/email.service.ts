import type { Email, EmailAttemptLog, EmailProvider, EmailResult } from '../interfaces/emails.interfaces';
import { IdempotencyService } from './idempotency.service';

export class EmailService {
    private providers: EmailProvider[];
    private maxRetries: number = 2; // Default max retries for each provider
    private idempotencyService: IdempotencyService;

    constructor(providers: EmailProvider[], idempotencyService: IdempotencyService) {
        if (providers.length === 0) {
            throw new Error('EmailService requires at least one provider.');
        }
        this.providers = providers;
        this.idempotencyService = idempotencyService;
    }

    public async sendEmail(email: Email): Promise<EmailResult> {

        const isNewEmail = await this.idempotencyService.checkAndSet(email);
        if (!isNewEmail) {
            return {
                overallSuccess: true,
                finalProvider: 'IdempotencyCheck',
                attempts: [],
                timestamp: new Date(),
            };
        }
        const attempts: EmailAttemptLog[] = [];

        // Loop through providers until one succeeds
        for (const provider of this.providers) {
            const providerResult = await this.sendWithRetry(provider, email, attempts);
            if (providerResult.success) {
                return {
                    overallSuccess: true,
                    finalProvider: provider.name(),
                    attempts: attempts,
                    timestamp: new Date(),
                };
            }

            console.warn(`Failed with provider: ${provider.name()}. Error: ${providerResult.error}`);
        }

        // If the loop completes without a successful send
        console.error(`All providers failed to send the email.`);
        await this.idempotencyService.deleteKey(email);
        return {
            overallSuccess: false,
            finalProvider: 'None',
            attempts: attempts,
            timestamp: new Date(),
        };
    }

    private async sendWithRetry(provider: EmailProvider, email: Email, attempts: EmailAttemptLog[]) {

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const result = await provider.send(email);

            // Add the log to attempts history.
            const attemptLog: EmailAttemptLog = {
                provider: provider.name(),
                attemptNumber: attempt,
                success: result.success,
                error: result.error,
                timestamp: new Date(),
            };
            attempts.push(attemptLog);

            if (result.success) {
                console.log(`Email sent with provider: ${provider.name()}`);
                return result;
            }

            console.warn(`Attempt ${attempt} failed with ${provider.name()}. Error: ${result.error}`);

            //Add a delay before the next attempt
            if (attempt < this.maxRetries) {
                const delay = 100 * Math.pow(2, attempt); // Simple exponential backoff
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }

        // If all attempts failed
        return {
            success: false,
            error: `All ${this.maxRetries} attempts failed with provider: ${provider.name()}'}`,
        }
    }
}