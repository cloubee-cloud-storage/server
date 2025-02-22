import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class InvitesService {
    constructor(private readonly prisma: PrismaService) {}

    public async createInvite(email: string, storageQuota: number) {
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
                email: email,
                storageQuota: storageQuota,
                token: token,
            },
        });

        return token;
    }

    public async getInvites() {
        return this.prisma.invite.findMany();
    }

    public async checkInvite(token: string) {
        const invite = await this.prisma.invite.findFirst({
            where: {
                token: token,
            },
        });

        if (!invite) {
            throw new NotFoundException('NOT_FOUND');
        }

        return invite.email;
    }

    public async deleteInvite(id: string) {
        return this.prisma.invite.delete({
            where: {
                id: id,
            },
        });
    }
}
