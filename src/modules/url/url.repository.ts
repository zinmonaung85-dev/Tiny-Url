import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/browser';
import { UrlDto } from './dtos/url.dto';
import { URLRepository } from './repository.interface';

@Injectable()
export class UrlRepository implements URLRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findShortCodeWithUser(shortCode: string, userId: string): Promise<UrlDto | null> {
        const url = await this.prisma.url.findUnique({
            where: {
                shortCode_userId: { shortCode, userId },
            },
        });

        if (!url || url.deletedAt) return null;
        return new UrlDto(url);
    }

    async findActiveByShortCode(shortCode: string): Promise<UrlDto | null> {
        const url = await this.prisma.url.findFirst({
            where: { shortCode, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        if (!url) return null;
        return new UrlDto(url);
    }

    async findActiveById(id: string, userId: string): Promise<UrlDto | null> {
        const url = await this.prisma.url.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!url) return null;
        return new UrlDto(url);
    }

    async create(dto: UrlDto): Promise<UrlDto> {
        const url = await this.prisma.url.create({
            data: {
                shortCode: dto.shortCode,
                originalUrl: dto.originalUrl,
                expiresAt: dto.expiresAt,
                createdAt: dto.createdAt,
                user: {
                    connect: { id: dto.userId },
                },
            },
        });

        return new UrlDto(url);
    }

    async redirectAndTrackVisit(urlId: string, ipHash: string, userAgent?: string): Promise<[UrlDto, any]> {
        const [updatedUrl, newVisit] = await Promise.all([
            this.prisma.url.update({
                where: { id: urlId },
                data: { clickCount: { increment: 1 } },
            }),
            this.prisma.visit.create({
                data: { urlId, ipHash, userAgent },
            }),
        ]);

        return [new UrlDto(updatedUrl), newVisit];
    }

    async updateUrl(id: string, data: Prisma.UrlUpdateInput): Promise<UrlDto> {
        const url = await this.prisma.url.update({
            where: { id },
            data,
        });
        return new UrlDto(url);
    }

    async deleteUrl(id: string): Promise<UrlDto> {
        const url = await this.prisma.url.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return new UrlDto(url);
    }

    async countActiveUrls(userId: string): Promise<number> {
        return this.prisma.url.count({
            where: { userId, deletedAt: null },
        });
    }

    async findManyWithPagination(userId: string, skip: number, size: number,): Promise<(UrlDto & { _count: { visits: number } })[]> {
        const urls = await this.prisma.url.findMany({
            where: { userId, deletedAt: null },
            skip,
            take: size,
            include: {
                _count: {
                    select: { visits: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return urls.map((url) => Object.assign(new UrlDto(url), { _count: url._count }));
    }

    async findVisits(where: Prisma.VisitWhereInput) {
        return this.prisma.visit.findMany({
            where,
            select: {
                ipHash: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
}