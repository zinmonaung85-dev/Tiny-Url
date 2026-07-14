import { Injectable, ConflictException } from '@nestjs/common';
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
}