import { Injectable } from '@nestjs/common';
import { UrlDto } from './dtos/url.dto';
import { RedisService } from './redis.service';
import { URLRepository } from './repository.interface';
import { UrlRepository } from './url.repository';
import { Prisma } from '../../generated/prisma/browser';

@Injectable()
export class CachedURLRepositoryDecorator implements URLRepository {
    constructor(
        private readonly cache: RedisService,
        private readonly repo: UrlRepository,
    ) { }

    async create(dto: UrlDto): Promise<UrlDto> {
        const createdDto = await this.repo.create(dto);
        await this.cache.set(createdDto);
        return createdDto;
    }

    async findShortCodeWithUser(shortCode: string, userId: string): Promise<UrlDto | null> {
        const cached = await this.cache.getURL(shortCode);
        if (cached && cached.userId === userId && !cached.deletedAt) {
            return cached;
        }

        const dbRecord = await this.repo.findShortCodeWithUser(shortCode, userId);
        if (dbRecord) {
            await this.cache.set(dbRecord);
        }
        return dbRecord;
    }

    async findActiveByShortCode(shortCode: string): Promise<UrlDto | null> {
        const cached = await this.cache.getURL(shortCode);
        if (cached && !cached.deletedAt) {
            return cached;
        }

        const dbRecord = await this.repo.findActiveByShortCode(shortCode);
        if (dbRecord) {
            await this.cache.set(dbRecord);
        }
        return dbRecord;
    }

    async findActiveById(id: string, userId: string): Promise<UrlDto | null> {
        return this.repo.findActiveById(id, userId);
    }

    async redirectAndTrackVisit(urlId: string, ipHash: string, userAgent?: string): Promise<[UrlDto, any]> {
        const [updatedUrl, newVisit] = await this.repo.redirectAndTrackVisit(urlId, ipHash, userAgent);
        await this.cache.set(updatedUrl);
        return [updatedUrl, newVisit];
    }

    async updateUrl(id: string, data: Prisma.UrlUpdateInput): Promise<UrlDto> {
        const updated = await this.repo.updateUrl(id, data);
        await this.cache.set(updated);
        return updated;
    }

    async deleteUrl(id: string): Promise<UrlDto> {
        const deleted = await this.repo.deleteUrl(id);
        await this.cache.delete(deleted.shortCode, deleted.userId ?? undefined);
        return deleted;
    }

    async countActiveUrls(userId: string): Promise<number> {
        return this.repo.countActiveUrls(userId);
    }

    async findManyWithPagination(userId: string, skip: number, size: number) {
        return this.repo.findManyWithPagination(userId, skip, size);
    }

    async findVisits(where: Prisma.VisitWhereInput) {
        return this.repo.findVisits(where);
    }
}