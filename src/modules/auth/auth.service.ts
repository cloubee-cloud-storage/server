import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/core/prisma/prisma.service';

import { AuthEntity } from './entity/auth.entity';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async login(email: string, password: string): Promise<AuthEntity> {
        const user = await this.prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            throw new NotFoundException(`No user found for email: ${email}`);
        }

        const isPasswordValid = bcrypt.compare(user.password, password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        return {
            accessToken: this.jwtService.sign({
                userId: user.id,
            }),
        };
    }

    async register(token: string, name: string, password: string) {
        try {
            const invite = await this.prisma.invite.findUnique({
                where: { token },
            });

            const hashedPassword = await bcrypt.hash(password, 10);
            await this.prisma.user.create({
                data: {
                    name: name,
                    email: invite.email,
                    password: hashedPassword,
                    role: invite.role,
                    quota: invite.quota,
                },
            });

            await this.prisma.invite.delete({
                where: { token },
            });

            return { message: 'User successfully registered' };
        } catch {
            throw new ForbiddenException('Unable to register user');
        }
    }
}
