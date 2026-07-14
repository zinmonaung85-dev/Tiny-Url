import { Controller, Post, Body, UseGuards, Get, Res, Param, Ip, Headers } from '@nestjs/common';
import * as Express from 'express';
import { UrlService } from './url.service';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { TrackVisitDto } from './dtos/track-visit.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('urls')
export class UrlController {
    constructor(
        private readonly urlService: UrlService,
    ) { }

    @Post('shorten')
    @UseGuards(AuthGuard)
    create(
        @CurrentUser('id')
        userId: string,

        @Body()
        dto: ShortenUrlDto,
    ) {
        return this.urlService.create(
            userId,
            dto,
        );
    }

    @Get('redir/:shortCode')
    async redirect(
        @Param('shortCode') shortCode: string,
        @Res() res: Express.Response,
    ) {
        const originalUrl = await this.urlService.redirectUrl(shortCode);

        return res.status(200).json({
            success: true,
            originalUrl: originalUrl,
            message: 'Found original URL successfully!'
        });
    }

    @Post('track')
    async track(
        @Body() dto: TrackVisitDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        const visits = await this.urlService.trackVisit(dto.shortCode, ip, userAgent);
        return {
            success: true,
            data: visits,
            message: 'Tracked user visits successfully!',
        };
    }
}