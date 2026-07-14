import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async register(input: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        const newUser = await this.prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                password: hashedPassword,
            },
        });

        return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
        };
    }

    async login(input: LoginDto) {
        const foundUser = await this.prisma.user.findUnique({
            where: { email: input.email },
        });

        if (!foundUser) {
            throw new BadRequestException('User not found');
        }

        const isSame = await bcrypt.compare(input.password, foundUser.password);
        if (!isSame) {
            throw new BadRequestException('Password does not match');
        }

        const payload = { id: foundUser.id, email: foundUser.email };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        return {
            accessToken,
            admin: {
                id: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
            },
        };
    }
}