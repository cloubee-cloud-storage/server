import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UpdateCurrentUserDto } from '@/modules/users/dto/update-current-user.dto';
import { UpdateUserByAdminDto } from '@/modules/users/dto/update-user-by-admin.dto';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserId } from '@/shared/decorators/user-id.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';

import { Role } from '../../../prisma/generated';

import { UsersService } from './users.service';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('users')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    findAll() {
        return this.usersService.findAll();
    }

    @Get('/user/me')
    getCurrentUser(@UserId() id: string) {
        return this.usersService.findById(id);
    }

    @Post('/user/me')
    updateCurrentUser(@UserId() id: string, @Body() dto: UpdateCurrentUserDto) {
        return this.usersService.updateCurrentUser(id, dto.name, dto.password);
    }

    @Get('/user/:id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Post('/user/:id')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    updateUserByAdmin(
        @Param('id') id: string,
        @Body() dto: UpdateUserByAdminDto,
    ) {
        return this.usersService.updateUserByAdmin(id, dto.role, dto.quota);
    }
}
