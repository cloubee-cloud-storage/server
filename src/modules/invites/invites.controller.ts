import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from 'prisma/generated';

import { Roles } from '@/shared/decorators/roles.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';

import { CreateInviteDto } from './dto/create-invite.dto';
import { InvitesService } from './invites.service';

@Controller('invites')
@ApiTags('Invites')
export class InvitesController {
    constructor(private readonly inviteService: InvitesService) {}

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    getInvites() {
        return this.inviteService.getInvites();
    }

    @Post('create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    create(@Body() createInviteDto: CreateInviteDto) {
        return this.inviteService.createInvite(
            createInviteDto.email,
            createInviteDto.role,
            createInviteDto.storageQuota,
        );
    }

    @Get(':token')
    checkInvite(@Param('token') token: string) {
        return this.inviteService.checkInvite(token);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    deleteInvite(@Param('id') id: string) {
        return this.inviteService.deleteInvite(id);
    }
}
