import { EmailService } from "../../src/services/email.service";
import type { Email, EmailProvider,} from "../../src/interfaces/emails.interfaces";
import { IdempotencyService } from "../../src/services/idempotency.service";

// 1. Mock the dependencies
// We create mock providers to control their behavior (success/failure) in our tests.
const mockFailingProvider: EmailProvider = {
    name: () => "FailingProvider",
    // jest.fn() creates a mock function. We set its return value.
    send: jest
        .fn()
        .mockResolvedValue({ success: false, error: "Provider failed" }),
};

const mockSuccessfulProvider: EmailProvider = {
    name: () => "SuccessfulProvider",
    send: jest.fn().mockResolvedValue({ success: true }),
};

// We also mock the IdempotencyService to avoid hitting Redis.
// We'll assume it's a new request for most tests.
const mockIdempotencyService = {
    checkAndSet: jest.fn().mockResolvedValue(true),
} as unknown as IdempotencyService;

const testEmail: Email = {
    to: ["test@example.com"],
    subject: "Test Subject",
    body: "Hello World",
};

// 2. Group tests with describe
describe("EmailService", () => {
    // Use beforeEach to reset mocks before each test run
    beforeEach(() => {
        // jest.clearAllMocks() is useful to reset call counts etc.
        jest.clearAllMocks();
    });

    it("should successfully send an email with the first provider", async () => {
        // Arrange: Set up the test scenario
        const providers = [mockSuccessfulProvider, mockFailingProvider];
        const emailService = new EmailService(providers, mockIdempotencyService);

        // Act: Execute the function being tested
        const result = await emailService.sendEmail(testEmail);

        // Assert: Check if the outcome is as expected
        expect(result.overallSuccess).toBe(true);
        expect(result.finalProvider).toBe("SuccessfulProvider");
        expect(mockSuccessfulProvider.send).toHaveBeenCalledTimes(1);
        expect(mockFailingProvider.send).not.toHaveBeenCalled();
    });

    it("should fallback to the second provider if the first one fails", async () => {
        // Arrange
        const providers = [mockFailingProvider, mockSuccessfulProvider];
        const emailService = new EmailService(providers, mockIdempotencyService);

        // Act
        const result = await emailService.sendEmail(testEmail);

        // Assert
        expect(result.overallSuccess).toBe(true);
        expect(result.finalProvider).toBe("SuccessfulProvider");
        // The failing provider should be called based on the maxRetries (default is 2)
        expect(mockFailingProvider.send).toHaveBeenCalledTimes(2);
        expect(mockSuccessfulProvider.send).toHaveBeenCalledTimes(1);
    });

    it("should return failure if all providers fail", async () => {
        // Arrange
        const providers = [mockFailingProvider, mockFailingProvider];
        const emailService = new EmailService(providers, mockIdempotencyService);

        // Act
        const result = await emailService.sendEmail(testEmail);

        // Assert
        expect(result.overallSuccess).toBe(false);
        expect(result.finalProvider).toBe("None");
        // Each failing provider should be called twice (2 retries)
        expect(mockFailingProvider.send).toHaveBeenCalledTimes(4); // 2 providers * 2 retries
    });

    it("should not send email if idempotency check fails", async () => {
        // Arrange
        // Override the mock for this specific test
        mockIdempotencyService.checkAndSet = jest.fn().mockResolvedValue(false);
        const providers = [mockSuccessfulProvider];
        const emailService = new EmailService(providers, mockIdempotencyService);

        // Act
        const result = await emailService.sendEmail(testEmail);

        // Assert
        expect(result.overallSuccess).toBe(true); // Idempotency is considered a success
        expect(result.finalProvider).toBe("IdempotencyCheck");
        expect(mockSuccessfulProvider.send).not.toHaveBeenCalled();
    });
});