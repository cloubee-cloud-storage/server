import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaService } from '@/core/prisma/prisma.service';

import { Role } from '../../../prisma/generated';

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
            throw new NotFoundException('NOT_FOUND');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new NotFoundException('NOT_FOUND');
        }

        const accessToken = this.jwtService.sign({ userId: user.id });

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 30,
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

    public async registerInvited(
        inviteToken: string,
        name: string,
        password: string,
        res: Response,
    ) {
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
                    role: Role.USER,
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

            const accessToken = this.jwtService.sign({ userId: user.id });

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: this.config.get<string>('NODE_ENV') === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 30,
            });

            return { message: 'User successfully registered' };
        } catch {
            throw new ForbiddenException('Unable to register user');
        }
    }

    public async registerAdmin(
        name: string,
        email: string,
        password: string,
        res: Response,
    ) {
        try {
            const hasAdmin = await this.isAdminExist();

            if (hasAdmin) {
                throw new ConflictException();
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.prisma.user.create({
                data: {
                    name: name,
                    email: email,
                    password: hashedPassword,
                    role: Role.ADMIN,
                    storageQuota: Number(
                        this.config.getOrThrow<number>(
                            'STORAGE_TOTAL_POOL_BYTES',
                        ),
                    ),
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

            const accessToken = this.jwtService.sign({ userId: user.id });

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: this.config.get<string>('NODE_ENV') === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 30,
            });

            return { message: 'Admin successfully registered' };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw new ConflictException('ADMIN_ALREADY_EXISTS');
            }

            throw new ForbiddenException('Unable to register user');
        }
    }

    public async isAdminExist(): Promise<boolean> {
        const admin = await this.prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        return !!admin;
    }
}
