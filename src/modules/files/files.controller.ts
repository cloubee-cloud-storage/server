import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { MkdirDto } from '@/modules/files/dto/mkdir.dto';
import { UserId } from '@/shared/decorators/user-id.decorator';

import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Get()
    @ApiQuery({ name: 'parentId', required: false })
    @ApiBearerAuth()
    getFiles(@UserId() userId: string, @Query('parentId') parentId?: string) {
        return this.filesService.getAll(userId, parentId);
    }

    @Post('mkdir')
    @ApiBearerAuth()
    mkdir(@UserId() id: string, @Body() dto: MkdirDto) {
        return this.filesService.mkdir(id, dto.folderName, dto.parentId);
    }
}
