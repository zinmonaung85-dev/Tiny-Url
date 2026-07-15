import { Controller, Post, Body, UseGuards, Get, Res, Param, Ip, Headers, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { UrlService } from './url.service';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetUrlListDto } from './dtos/get-urls.dto';

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
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
        @Res() res: Response,
    ) {
        const result = await this.urlService.redirectUrl(shortCode, ip, userAgent);

        return res.status(200).json({
            success: true,
            originalUrl: result.originalUrl,
            analytics: result.analytics,
            message: 'Found original URL and tracked visit successfully!'
        });
    }

    @Get()
    @UseGuards(AuthGuard)
    @UsePipes(new ValidationPipe({ transform: true }))

    async getUrls(
        @CurrentUser('id') userId: string,
        @Body() input: GetUrlListDto
    ) {
        const result = await this.urlService.getUrls(userId, input);
        return {
            success: true,
            data: result,
            message: 'Fetched URLs successfully!'
        };
    }
}