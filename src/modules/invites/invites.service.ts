import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '@/core/prisma/prisma.service';

import { Role } from '../../../prisma/generated';

@Injectable()
export class InvitesService {
    constructor(private readonly prisma: PrismaService) {}
    async createInvite(email: string, role: Role, quota: number) {
        const existingInvite = await this.prisma.invite.findFirst({
            where: { email: email },
        });

        if (existingInvite) {
            throw new BadRequestException(
                'Invite with this email already exists',
            );
        }

        const token = uuidv4();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.invite.create({
            data: {
                email,
                role,
                quota,
                token,
            },
        });

        return token;
    }

    async getInvites() {
        return this.prisma.invite.findMany();
    }

    async checkInvite(token: string) {
        const isInvite = await this.prisma.invite.findFirst({
            where: {
                token: token,
            },
        });

        return !!isInvite;
    }

    async deleteInvite(id: string) {
        return this.prisma.invite.delete({
            where: {
                id: id,
            },
        });
    }
}
