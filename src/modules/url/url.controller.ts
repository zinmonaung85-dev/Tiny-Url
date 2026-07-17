import { Controller, Post, Body, UseGuards, Get, Res, Param, Query, Ip, Headers, Patch, Delete } from '@nestjs/common';
import type { Response } from 'express';
import { UrlService } from './url.service';
import { ShortenUrlDto } from './dtos/shorten-url.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetUrlListDto } from './dtos/get-urls.dto';
import { GetAnalyticsDto } from './dtos/get-analytics.dto';
import { UpdateUrlDto } from './dtos/update-url.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';


@ApiTags('URL Shortener')
@UseGuards(AuthGuard)
@Controller('urls')
export class UrlController {
    constructor(
        private readonly urlService: UrlService,
    ) { }

    @Post('shorten')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a shortened URL' })
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
    @Public()
    @ApiOperation({ summary: 'Redirect short code to original URL and track analytics' })
    @ApiParam({ name: 'shortCode', description: 'The unique code of shortened URL' })
    @ApiHeader({
        name: 'user-agent',
        required: false,
    })
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
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all URLs created by the current user' })

    async getUrls(
        @CurrentUser('id') userId: string,
        @Query() input: GetUrlListDto
    ) {
        const result = await this.urlService.getUrls(userId, input);
        return {
            success: true,
            data: result,
            message: 'Fetched URLs successfully!'
        };
    }

    @Patch(':id')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a shortened URL by ID' })
    @ApiParam({ name: 'id', description: 'URL ID' })

    async updateUrl(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() input: UpdateUrlDto
    ) {
        const updatedUrl = await this.urlService.updateUrl(userId, id, input);

        return {
            success: true,
            data: updatedUrl,
            message: "Updated URL successfully!"
        };
    }

    @Delete(':id')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Delete a shortened URL by ID' })
    @ApiParam({ name: 'id', description: 'URL ID' })

    async deleteUrl(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
    ) {
        const deletedUrl = await this.urlService.deleteUrl(userId, id);

        return {
            success: true,
            data: deletedUrl,
            message: "Deleted URL successfully!"
        };
    }

    @Get(':id/analytics')
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get analytics for a specific URL' })
    @ApiParam({ name: 'id', description: 'URL ID' })

    async analytics(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Query() input: GetAnalyticsDto
    ) {
        const analytics = await this.urlService.analytics(id, userId, input);

        return {
            success: true,
            data: analytics,
            message: "Fetched analytics successfully!"
        };
    }

}