import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RegisterAdminDto } from '@/modules/auth/dto/register-admin.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.login(loginDto.email, loginDto.password, res);
    }

    @Post('logout')
    logout(@Res() res: Response) {
        return res.json(this.authService.logout(res));
    }

    @Post('register-invited')
    register(
        @Body() registerDto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.registerInvited(
            registerDto.token,
            registerDto.name,
            registerDto.password,
            res,
        );
    }

    @Post('register-admin')
    registerAdmin(
        @Body() registerAdminDto: RegisterAdminDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.registerAdmin(
            registerAdminDto.name,
            registerAdminDto.email,
            registerAdminDto.password,
            res,
        );
    }

    @Get('is-admin-exist')
    async isAdminExist() {
        return this.authService.isAdminExist();
    }

    @UseGuards(JwtAuthGuard)
    @Get('validate-request')
    validateRequest() {
        return { message: 'AUTHORIZED' };
    }
}
