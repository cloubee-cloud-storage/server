import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {}

    public async login(
        email: string,
        password: string,
        res: Response,
    ): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            throw new NotFoundException(`No user found for email: ${email}`);
        }

        const isPasswordValid = await bcrypt.compare(user.password, password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        const accessToken = this.jwtService.sign({ userId: user.id });

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
        });

        return { message: `Logged in successfully.` };
    }

    public async logout(res: Response): Promise<{ message: string }> {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
        });

        return { message: 'Exit successful' };
    }

    public async register(inviteToken: string, name: string, password: string) {
        try {
            const invite = await this.prisma.invite.findUnique({
                where: { token: inviteToken },
            });

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.prisma.user.create({
                data: {
                    name: name,
                    email: invite.email,
                    password: hashedPassword,
                    role: invite.role,
                    storageQuota: invite.storageQuota,
                },
            });

            const userFolder = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                user.id,
            );

            if (!fs.existsSync(userFolder)) {
                fs.mkdirSync(path.join(userFolder, 'files'), {
                    recursive: true,
                });
                fs.mkdirSync(path.join(userFolder, 'thumbnails'), {
                    recursive: true,
                });
            }

            await this.prisma.invite.delete({
                where: { token: inviteToken },
            });

            return { message: 'User successfully registered' };
        } catch {
            throw new ForbiddenException('Unable to register user');
        }
    }
}
