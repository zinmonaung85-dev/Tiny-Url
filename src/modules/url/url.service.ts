import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { GetUrlListDto } from './dtos/get-urls.dto';
import { UpdateUrlDto } from './dtos/update-url.dto';
import { GetAnalyticsDto } from './dtos/get-analytics.dto';
import { HashingService } from '../../modules/hashing/hashing.service';
import { VisitWhereInput } from '../../generated/prisma/models';
import { Prisma } from '../../generated/prisma/browser';


@Injectable()
export class UrlService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashingService: HashingService,
    ) { }

    async create(userId: string, dto: ShortenUrlDto) {

        const shortCode = this.hashingService.generateShortCode(
            dto.originalUrl,
            userId
        );

        const existingUrl = await this.prisma.url.findUnique({
            where: {
                shortCode_userId: {
                    shortCode,
                    userId,
                },
            },
        });

        if (existingUrl) {
            throw new ConflictException('Short URL already exists for this user.');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const url = await this.prisma.url.create({
            data: {
                userId,
                originalUrl: dto.originalUrl,
                shortCode,
                expiresAt,
            },
        });

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

        const url = await this.prisma.url.findFirst({
            where: {
                shortCode,
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!url) {
            throw new NotFoundException('Requested short URL was not found.');
        }

        if (url.expiresAt && new Date() > url.expiresAt) {
            throw new BadRequestException('This short URL has expired.');
        }

        const ipHash = this.hashingService.hashIp(ip);

        const [updatedUrl, newVisit] = await Promise.all([
            this.prisma.url.update({
                where: { id: url.id },
                data: {
                    clickCount: { increment: 1 }
                },
            }),
            this.prisma.visit.create({
                data: {
                    urlId: url.id,
                    ipHash,
                    userAgent,
                },
            }),
        ]);

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
                    trackedAt: newVisit.createdAt
                }
            }
        };
    }

    async getUrls(userId: string, input: GetUrlListDto): Promise<any> {

        const page = input.page ?? 1;
        const size = input.size ?? 10;

        const skip = (page - 1) * size;

        const [totalUrls, data] = await Promise.all([
            this.prisma.url.count({
                where: {
                    userId,
                    deletedAt: null,
                }
            }),

            this.prisma.url.findMany({
                where: {
                    userId,
                    deletedAt: null,
                },

                skip,
                take: size,

                include: {
                    _count: {
                        select: {
                            visits: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
        ]);

        return {
            urls: data,
            totalUrls,
            urlCount: data.length,
            page: input.page,
            size: input.size,
            totalPages: Math.ceil(totalUrls / size),
        };
    }

    async updateUrl(userId: string, id: string, input: UpdateUrlDto): Promise<any> {

        const url = await this.prisma.url.findFirst({
            where: {
                userId,
                id,
                deletedAt: null
            }
        });

        if (!url) {
            throw new NotFoundException("Url not found");
        }

        const updatedUrl = await this.prisma.url.update({
            where: {
                id
            },
            data: input
        });

        return updatedUrl;
    }


    async deleteUrl(userId: string, id: string): Promise<any> {

        const url = await this.prisma.url.findFirst({
            where: {
                userId,
                id,
                deletedAt: null
            }
        });

        if (!url) {
            throw new NotFoundException("Url not found");
        }

        const deletedUrl = await this.prisma.url.update({
            where: {
                id,
            },
            data: { deletedAt: new Date() }
        });

        return deletedUrl;
    }


    async analytics(id: string, userId: string, input: GetAnalyticsDto): Promise<any> {

        const url = await this.prisma.url.findFirst({
            where: {
                id,
                userId,
                deletedAt: null
            }
        });

        if (!url) {
            throw new NotFoundException("Url not found");
        }

        const where: Prisma.VisitWhereInput = {
            urlId: id
        };

        if (input.startDate || input.endDate) {
            where.createdAt = {};

            if (input.startDate) {
                where.createdAt.gte = new Date(input.startDate);
            }

            if (input.endDate) {
                where.createdAt.lte = new Date(input.endDate);
            }

        }

        const visits = await this.prisma.visit.findMany({
            where,
            select: {
                ipHash: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc'
            },
        });

        const totalClicks = visits.length;
        const uniqueVisitors = new Set(visits.map((v) => v.ipHash)).size;
        const lastVisitedAt = visits.length > 0 ? visits[visits.length - 1].createdAt : null;

        const dailyClicks: { date: string; clicks: number }[] = [];

        for (const visit of visits) {

            const date = visit.createdAt.toISOString().split('T')[0];
            const index = dailyClicks.findIndex(item => item.date === date);

            if (index === -1) {
                dailyClicks.push({
                    date,
                    clicks: 1,
                });
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
}

