import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
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

    @Get('trash')
    @ApiBearerAuth()
    getTrash(@UserId() userId: string) {
        return this.filesService.getTrashFiles(userId);
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

    @Get(':fileId')
    @ApiBearerAuth()
    getFile(
        @UserId() userId: string,
        @Param('fileId') fileId: string,
        @Res() res: Response,
    ) {
        return this.filesService.getFile(userId, fileId, res);
    }

    @Get(':fileId/thumbnail/:size')
    @ApiParam({
        name: 'size',
        enum: ['small', 'medium', 'large'], // Допустимые значения
        example: 'medium',
    })
    @ApiBearerAuth()
    getThumbnail(
        @UserId() userId: string,
        @Param('fileId') fileId: string,
        @Param('size') size: 'small' | 'medium' | 'large',
        @Res() res: Response,
    ) {
        return this.filesService.getThumbnail(userId, fileId, size, res);
    }

    @Post('rename/:fileId/:fileName')
    @ApiBearerAuth()
    rename(
        @UserId() userId: string,
        @Param('fileId') fileId: string,
        @Param('fileName') fileName: string,
    ) {
        return this.filesService.rename(userId, fileId, fileName);
    }

    @Delete(':fileId')
    @ApiBearerAuth()
    moveToTrash(@UserId() userId: string, @Param('fileId') fileId: string) {
        return this.filesService.moveToTrash(userId, fileId);
    }

    @Post('trash/restore/:fileId')
    @ApiBearerAuth()
    moveFromTrash(@UserId() userId: string, @Param('fileId') fileId: string) {
        return this.filesService.moveFromTrash(userId, fileId);
    }

    @Delete('trash/:fileId')
    @ApiBearerAuth()
    deletePermanently(
        @UserId() userId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.filesService.deletePermanently(userId, fileId);
    }
}
