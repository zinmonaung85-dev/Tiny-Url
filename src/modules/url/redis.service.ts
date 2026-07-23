import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';
import { UrlDto } from './dtos/url.dto';

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS_CONN') private client: RedisClientType) { }

    async set(url: UrlDto): Promise<void> {
        const key = `url:${url.shortCode}`;

        await this.client.set(key, JSON.stringify(url));

        if (url.userId) {
            await this.client.zAdd(`user:${url.userId}`, {
                value: url.shortCode,
                score: new Date(url.createdAt).getTime(),
            });
        }
    }

    async getURL(shortCode: string): Promise<UrlDto | null> {
        const rawData = await this.client.get(`url:${shortCode}`);

        if (!rawData) {
            return null;
        }

        const data = JSON.parse(rawData);

        return new UrlDto({
            id: data.id,
            userId: data.userId,
            shortCode: data.shortCode,
            originalUrl: data.originalUrl,
            clickCount: Number(data.clickCount || 0),
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            createdAt: new Date(data.createdAt),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        });
    }

    async updateClickCount(shortCode: string): Promise<boolean> {
        const url = await this.getURL(shortCode);

        if (!url) {
            return false;
        }

        url.clickCount += 1;
        await this.set(url);
        return true;
    }

    async delete(shortCode: string, userId?: string): Promise<void> {
        await this.client.del(`url:${shortCode}`);
        if (userId) {
            await this.client.zRem(`user:${userId}`, shortCode);
        }
    }
}