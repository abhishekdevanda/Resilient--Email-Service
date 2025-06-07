import { type Request, type Response, type NextFunction } from 'express';
import { createHash } from 'crypto';
import { redis } from '../utils/redis.client'; // Assuming you have a shared redis client

const RATE_LIMIT_COUNT = 5; // 20 requests
const WINDOW_SECONDS = 60; // per 60 seconds

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const key = `rate_limit:${req.ip}`;
        const now = Date.now();
        const windowStart = now - WINDOW_SECONDS * 1000;

        // A unique value for the current request to add to the sorted set.
        const requestIdentifier = `${now}:${createHash('md5')
            .update(Math.random().toString())
            .digest('hex')}`;

        // Start a Redis transaction. All commands will be executed atomically.
        const multi = redis.multi();

        // 1. Remove all requests from the sorted set that are older than our window.
        // This keeps the set clean and memory-efficient.
        multi.zremrangebyscore(key, 0, windowStart);

        // 2. Add the current request to the set.
        multi.zadd(key, { score: now, member: requestIdentifier });

        // 3. Count how many requests are left in the window.
        multi.zcard(key);

        // 4. Set the key to expire after the window duration.
        // This is a safety measure to clean up Redis memory for inactive IPs.
        multi.expire(key, WINDOW_SECONDS);

        // Execute the transaction and get the results.
        const results = await multi.exec();

        // The result of zcard (the count) is the 3rd item in the results array.
        const requestCount = results[2] as number;

        if (requestCount > RATE_LIMIT_COUNT) {
            console.warn(`[RateLimiter] Blocked request from IP: ${req.ip}`);
            res.status(429).json({
                error: 'Too Many Requests',
                message: `You have exceeded the limit of ${RATE_LIMIT_COUNT} requests per minute.`,
            });
            return
        }

        next();
    } catch (error) {
        console.error('[RateLimiter] Redis error:', error);
        next(error);
    }
};