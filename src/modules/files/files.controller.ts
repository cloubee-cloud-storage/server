import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { MkdirDto } from '@/modules/files/dto/mkdir.dto';
import { UserId } from '@/shared/decorators/user-id.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Get()
    @ApiQuery({ name: 'directoryId', required: false })
    @ApiBearerAuth()
    getFiles(
        @UserId() userId: string,
        @Query('directoryId') directoryId?: string,
    ) {
        return this.filesService.getAll(userId, directoryId);
    }

    @Post('mkdir')
    @ApiBearerAuth()
    mkdir(@UserId() userId: string, @Body() dto: MkdirDto) {
        return this.filesService.mkdir(userId, dto.folderName, dto.directoryId);
    }

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiQuery({ name: 'directoryId', required: false })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiBearerAuth()
    upload(
        @UserId() userId: string,
        @Req() req: Request,
        @Res() res: Response,
        @Query('directoryId') directoryId?: string,
    ) {
        return this.filesService.upload(userId, req, res, directoryId);
    }
}
