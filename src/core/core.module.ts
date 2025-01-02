import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '@/modules/auth/auth.module';
import { InvitesModule } from '@/modules/invites/invites.module';
import { UsersModule } from '@/modules/users/users.module';
import { IS_DEV_ENV } from '@/shared/utils/is-dev.util';

import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            ignoreEnvFile: !IS_DEV_ENV,
            isGlobal: true,
        }),
        PrismaModule,
        UsersModule,
        AuthModule,
        InvitesModule,
    ],
})
export class CoreModule {}
