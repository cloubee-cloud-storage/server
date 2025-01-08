import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaService } from '@/core/prisma/prisma.service';

import { AuthEntity } from './entity/auth.entity';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private readonly config: ConfigService,
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
            const user = await this.prisma.user.create({
                data: {
                    name: name,
                    email: invite.email,
                    password: hashedPassword,
                    role: invite.role,
                    quota: invite.quota,
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
                where: { token },
            });

            return { message: 'User successfully registered' };
        } catch {
            throw new ForbiddenException('Unable to register user');
        }
    }
}
