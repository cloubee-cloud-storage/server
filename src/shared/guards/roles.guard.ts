import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            'roles',
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User is not authenticated');
        }

        const userFromDb = await this.prisma.user.findUnique({
            where: { id: user.id },
        });

        if (!userFromDb) {
            throw new ForbiddenException('User not found');
        }

        if (!requiredRoles.includes(userFromDb.role)) {
            throw new ForbiddenException('Access denied');
        }

        return true;
    }
}
