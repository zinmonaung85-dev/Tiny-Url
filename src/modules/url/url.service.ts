import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashingService } from '../../modules/hashing/hashing.service';
import { GetAnalyticsDto } from './dtos/get-analytics.dto';
import { GetUrlListDto } from './dtos/get-urls.dto';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { UpdateUrlDto } from './dtos/update-url.dto';
import { URL_REPOSITORY, type URLRepository } from './repository.interface';
import { UrlDto } from './dtos/url.dto';

@Injectable()
export class UrlService {
    constructor(
        @Inject(URL_REPOSITORY) private readonly repo: URLRepository,
        private readonly hashingService: HashingService,
        @Inject('REDIS_CONN') private readonly redis: any,
    ) { }

    async create(userId: string, dto: ShortenUrlDto) {
        const shortCode = this.hashingService.generateShortCode(dto.originalUrl, userId);

        const existingUrl = await this.repo.findShortCodeWithUser(shortCode, userId);
        if (existingUrl) {
            throw new ConflictException('Short URL already exists for this user.');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const urlDto = new UrlDto({
            userId,
            shortCode,
            originalUrl: dto.originalUrl,
            expiresAt,
        });

        const url = await this.repo.create(urlDto);

        return {
            id: url.id,
            shortCode: url.shortCode,
            originalUrl: url.originalUrl,
            clickCount: url.clickCount,
            expiresAt: url.expiresAt,
            createdAt: url.createdAt,
        };
    }

    async redirectUrl(shortCode: string, ip: string, userAgent?: string): Promise<any> {

        const url = await this.repo.findActiveByShortCode(shortCode);

        if (!url) {
            throw new NotFoundException('Requested short URL was not found.');
        }

        if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
            throw new BadRequestException('This short URL has expired.');
        }

        const ipHash = this.hashingService.hashIp(ip);
        const [updatedUrl, newVisit] = await this.repo.redirectAndTrackVisit(url.id, ipHash, userAgent);

        let targetUrl = url.originalUrl ? url.originalUrl.trim() : '';
        if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        return {
            originalUrl: targetUrl,
            analytics: {
                totalClicks: updatedUrl.clickCount,
                latestVisit: {
                    id: newVisit.id,
                    userAgent: newVisit.userAgent,
                    trackedAt: newVisit.createdAt,
                },
            },
        };
    }

    async getUrls(userId: string, input: GetUrlListDto): Promise<any> {
        const page = input.page ?? 1;
        const size = input.size ?? 10;
        const skip = (page - 1) * size;

        const [totalUrls, data] = await Promise.all([
            this.repo.countActiveUrls(userId),
            this.repo.findManyWithPagination(userId, skip, size),
        ]);

        return {
            urls: data,
            totalUrls,
            urlCount: data.length,
            page,
            size,
            totalPages: Math.ceil(totalUrls / size),
        };
    }

    async updateUrl(userId: string, id: string, input: UpdateUrlDto): Promise<any> {
        const url = await this.repo.findActiveById(id, userId);

        if (!url) {
            throw new NotFoundException('Url not found');
        }

        return this.repo.updateUrl(id, input);
    }

    async deleteUrl(userId: string, id: string): Promise<any> {
        const url = await this.repo.findActiveById(id, userId);
        if (!url) {
            throw new NotFoundException('Url not found');
        }

        return this.repo.deleteUrl(id);
    }

    async analytics(id: string, userId: string, input: GetAnalyticsDto): Promise<any> {
        const url = await this.repo.findActiveById(id, userId);
        if (!url) {
            throw new NotFoundException('Url not found');
        }

        const where: Prisma.VisitWhereInput = { urlId: id };

        if (input.startDate || input.endDate) {
            where.createdAt = {};
            if (input.startDate) where.createdAt.gte = new Date(input.startDate);
            if (input.endDate) where.createdAt.lte = new Date(input.endDate);
        }

        const visits = await this.repo.findVisits(where);

        const totalClicks = visits.length;
        const uniqueVisitors = new Set(visits.map((v) => v.ipHash)).size;
        const lastVisitedAt = visits.length > 0 ? visits[visits.length - 1].createdAt : null;

        const dailyClicks: { date: string; clicks: number }[] = [];
        for (const visit of visits) {
            const date = new Date(visit.createdAt).toISOString().split('T')[0];
            const index = dailyClicks.findIndex((item) => item.date === date);

            if (index === -1) {
                dailyClicks.push({ date, clicks: 1 });
            } else {
                dailyClicks[index].clicks++;
            }
        }

        return {
            urlInfo: {
                id: url.id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                createdAt: url.createdAt,
            },
            totalClicks,
            uniqueVisitors,
            lastVisitedAt,
            dailyClicks,
        };
    }

    async testRedis() {
        await this.redis.set('test', 'Hello Redis');
        const value = await this.redis.get('test');
        return { message: 'Redis is working!', value };
    }
}