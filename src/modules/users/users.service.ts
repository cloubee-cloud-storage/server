import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/core/prisma/prisma.service';

import { Role } from '../../../prisma/generated';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.user.findMany();
    }

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

    async updateCurrentUser(id: string, name?: string, password?: string) {
        if (!name && !password) {
            throw new InternalServerErrorException('No changes provided');
        }

        try {
            const updateData: any = {};

            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }

            if (name) {
                updateData.name = name;
            }

            await this.prisma.user.update({
                where: { id },
                data: updateData,
            });

            return { message: 'User updated successfully.' };
        } catch {
            throw new InternalServerErrorException('Error during update');
        }
    }

    async updateUserByAdmin(id: string, role?: Role, quota?: number) {
        if (!role && !quota) {
            throw new InternalServerErrorException('No changes provided');
        }

        try {
            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: {
                    ...(role && { role }),
                    ...(quota && { quota }),
                },
            });

            return { message: 'User updated successfully.', updatedUser };
        } catch {
            throw new InternalServerErrorException('Error during update');
        }
    }
}
