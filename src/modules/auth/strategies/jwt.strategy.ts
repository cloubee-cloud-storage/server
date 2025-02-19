import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

import { UsersService } from '@/modules/users/users.service';
import { cookieExtractor } from '@/shared/utils/cookie-extractor.utils';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: cookieExtractor,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: { userId: string }) {
        const user = await this.usersService.findById(payload.userId);

        if (!user) {
            throw new UnauthorizedException();
        }

        return user;
    }
}
