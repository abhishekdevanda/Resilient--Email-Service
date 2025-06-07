import type { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/redis.client';

const RATE_LIMIT_COUNT = 5; // 5 requests
const WINDOW_SECONDS = 60; // per 60 seconds

export const rateLimiter = async (req: Request, res: Response, next: NextFunction,) => {
    try {
        const key = `rate_limit:${req.ip}`;
        
        // Increment the counter for the user's IP
        const requestCount = await redis.incr(key);
        
        // Set the expiration only on the first request in the window
        if (requestCount === 1) {
            await redis.expire(key, WINDOW_SECONDS);
        }
        
        if (requestCount > RATE_LIMIT_COUNT) {
            console.warn(`Too many request from IP: ${req.ip}`);
            res.status(429).json({
                error: 'Too Many Requests',
                message: `You have exceeded the limit of ${RATE_LIMIT_COUNT} requests per minute.`,
            });
            return;
        }
        
        next();
    } catch (error) {
        console.error('Redis error:', error);
        next();
    }
};