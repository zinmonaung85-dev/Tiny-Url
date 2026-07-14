import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { HashingService } from '../../modules/hashing/hashing.service';


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

    async redirectUrl(shortCode: string): Promise<any> {
        const url = await this.prisma.url.findFirst({
            where: {
                shortCode,
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!url) {
            return null;
        }

        if (url.expiresAt && new Date() > url.expiresAt) {
            throw new BadRequestException('This short URL has expired.');
        }

        return url.originalUrl;
    }

    async trackVisit(shortCode: string, ip: string, userAgent?: string) {
        const url = await this.prisma.url.findFirst({
            where: { shortCode, deletedAt: null },
            select: { id: true }
        });

        if (!url) {
            throw new NotFoundException('Requested short URL was not found.');
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

        return {
            totalClicks: updatedUrl.clickCount,
            latestVisit: {
                id: newVisit.id,
                userAgent: newVisit.userAgent,
                trackedAt: newVisit.createdAt
            }
        };
    }
}