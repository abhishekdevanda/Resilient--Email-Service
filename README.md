# Resilient Email Service

A TypeScript email service with retry logic, fallback mechanisms, idempotency, and rate limiting.

## Features

- **Retry Logic**: Exponential backoff for failed attempts
- **Provider Fallback**: Switches between email providers on failure
- **Idempotency**: Prevents duplicate email sends
- **Rate Limiting**: 5 requests/minute per IP
- **Status Tracking**: Logs all email attempts

## Setup

### Prerequisites
- Node.js (v18+)
- Upstash Redis account

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   Create `.env` file:
   ```env
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   PORT=6000
   ```

3. **Run the service:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build && npm start
   ```

## API Usage

**POST** `/api/email/send`

```json
{
  "to": ["recipient@example.com"],
  "subject": "Test Email",
  "body": "Email content here"
}
```

**Response:**
```json
{
  "message": "Email controller is working",
  "results": {
    "overallSuccess": true,
    "finalProvider": "MockProvider1",
    "attempts": [...],
    "timestamp": "2025-06-06T12:03:31.000Z"
  }
}
```

## Configuration

- **Retry**: 2 attempts per provider with exponential backoff
- **Rate Limit**: 5 requests per minute per IP
- **Idempotency**: 10-minute window using email content hash
- **Mock Providers**: Provider1 (70% failure), Provider2 (40% failure)

## Key Components

- **EmailService**: Core service with retry and fallback logic
- **IdempotencyService**: Prevents duplicate sends using Redis
- **Rate Limiter**: IP-based rate limiting middleware
- **Mock Providers**: Simulate real email providers with configurable failure rates
