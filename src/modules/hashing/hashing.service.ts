import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HashingService {
    private readonly hmacSecret = process.env.HMAC_SECRET || 'fallback_super_secret_key';

    generateShortCode(originalUrl: string, userId: string): string {
        const saltData = `${originalUrl}-${userId}-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

        const hash = crypto
            .createHmac('sha256', this.hmacSecret)
            .update(saltData)
            .digest('hex');

        return hash.substring(0, 8);
    }

    hashIp(ip: string): string {
        return crypto.createHash('sha256').update(ip).digest('hex');
    }
}