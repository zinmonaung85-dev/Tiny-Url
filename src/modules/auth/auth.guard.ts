import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
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