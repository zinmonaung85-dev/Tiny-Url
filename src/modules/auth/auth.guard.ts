import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header must be provided');
        }

        const [type, token] = authHeader.split(' ');
        if ((type !== 'JWT' && type !== 'Bearer') || !token) {
            throw new UnauthorizedException('Invalid authorization header format');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });

            if (!payload || !payload.id) {
                throw new UnauthorizedException('Invalid jwt token');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.id },
            });

            if (!user) {
                throw new UnauthorizedException('Invalid jwt token');
            }

            request['user'] = user;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}