import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import type { Email } from '../interfaces/emails.interfaces';

export class IdempotencyService {
    private redis: Redis;
    private keyPrefix: string = 'idempotency';
    private expire: number = 600; // 10 minutes

    constructor(redisClient: Redis) {
        this.redis = redisClient;
    }

    private _generateKey(email: Email): string {
        const sortedTo = [...email.to].sort();
        const keyData = `${sortedTo.join(",")}:${email.subject}:${email.body}`;
        const hash = createHash("sha256").update(keyData).digest("hex");
        return `${this.keyPrefix}:${hash}`;
    }

    public async checkAndSet(email: Email): Promise<boolean> {
        const idempotencyKey = this._generateKey(email);

        const result = await this.redis.set(idempotencyKey, 'processed', {
            ex: this.expire,
            nx: true, // Set only if the key does not exist
        });

        // 'set' with 'nx' returns 'OK' on success (key was set) or null on failure (key already existed).
        if (result === 'OK') {
            return true; // It's a new request
        } else {
            console.warn(`Duplicate email request detected.`);
            return false; // It's a duplicate request
        }
    }

    public async deleteKey(email: Email): Promise<void> {
        const idempotencyKey = this._generateKey(email);
        await this.redis.del(idempotencyKey);
        return
    }
}