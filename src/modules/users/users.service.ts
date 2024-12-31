import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: id,
            },
        });

        if (!user) {
            throw new Error(`User with ID-${id} not found`);
        }

        return user;
    }
}
