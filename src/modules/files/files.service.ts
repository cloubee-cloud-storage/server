import {
    ConflictException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Busboy from 'busboy';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '@/core/prisma/prisma.service';

import { File } from '../../../prisma/generated';

@Injectable()
export class FilesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    async getAll(userId: string, directoryId?: string): Promise<File[]> {
        return this.prisma.file.findMany({
            where: {
                userId: userId,
                directoryId: directoryId ?? null,
            },
        });
    }

    async mkdir(
        userId: string,
        folderName: string,
        directoryId?: string,
    ): Promise<string> {
        const isFreeName = await this.prisma.file.findFirst({
            where: {
                name: folderName,
                isDirectory: true,
                directoryId: directoryId,
            },
        });

        if (isFreeName) {
            throw new ConflictException('Folder name already exists');
        }

        let directory: File;
        let userFolder: string;

        if (directoryId) {
            directory = await this.prisma.file.findUnique({
                where: { id: directoryId },
            });

            if (!directory || !directory.isDirectory) {
                throw new NotFoundException(
                    'Directory not found or is not a folder',
                );
            }

            userFolder = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                directory.path,
                folderName,
            );
        } else {
            userFolder = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                userId,
                'files',
                folderName,
            );
        }

        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        await this.prisma.file.create({
            data: {
                name: folderName,
                userId: userId,
                directoryId: directoryId ?? null,
                size: 0,
                path: directoryId
                    ? path.join(directory.path, folderName)
                    : path.join(userId, 'files', folderName),
                isDirectory: true,
            },
        });

        return userFolder;
    }

    async upload(
        userId: string,
        req: Request,
        res: Response,
        directoryId?: string,
    ) {
        const busboy = Busboy({ headers: req.headers });

        let uploadDir: string;
        let directory: File;
        let fileName: string;
        let fileSize: number = 0;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        const quota = user.storageQuota;
        const usedSpace = user.usedQuota;
        const remainingSpace = quota - usedSpace;

        if (directoryId) {
            directory = await this.prisma.file.findUnique({
                where: { id: directoryId },
            });

            if (!directory || !directory.isDirectory) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'Directory not found or is not a directory',
                });
            }

            uploadDir = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                directory.path,
            );
        } else {
            uploadDir = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                userId,
                'files',
            );
        }

        if (!fs.existsSync(uploadDir)) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Directory not found or is not a directory',
            });
        }

        busboy.on('file', async (_, file, fileInfo) => {
            fileName = fileInfo.filename;

            const isFreeName = await this.prisma.file.findFirst({
                where: {
                    name: fileName,
                    isDirectory: false,
                    directoryId: directoryId ?? null,
                },
            });

            if (isFreeName) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'The file name is already taken',
                });
                return;
            }

            file.on('data', chunk => {
                fileSize += chunk.length;

                if (fileSize > remainingSpace) {
                    file.resume();
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        message: 'Not enough disk space available.',
                    });
                }
            });

            const saveTo = path.join(uploadDir, fileName);
            const writeStream = fs.createWriteStream(saveTo);

            file.pipe(writeStream);

            file.on('error', () => {
                writeStream.destroy();
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'Error uploading file.',
                });
            });

            writeStream.on('finish', async () => {
                await this.prisma.file.create({
                    data: {
                        name: fileName,
                        userId: userId,
                        directoryId: directoryId ?? null,
                        size: fileSize,
                        mimeType: fileInfo.mimeType,
                        path: directoryId
                            ? path.join(directory.path, fileName)
                            : path.join(userId, 'files', fileName),
                    },
                });

                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        usedQuota: usedSpace + fileSize,
                    },
                });
            });

            writeStream.on('error', () => {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'Error writing file.',
                });
            });
        });

        busboy.on('finish', () => {
            res.status(HttpStatus.OK).json({
                message: 'File uploaded successfully.',
                file: fileName,
                size: fileSize,
                path: uploadDir,
            });
        });

        busboy.on('error', () => {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Error processing request.',
            });
        });

        req.pipe(busboy);
    }
}
