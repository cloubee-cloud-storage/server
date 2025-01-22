import {
    BadRequestException,
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
import { generateThumbnails } from '@/shared/utils/generate-thumbnails.utils';

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
    ): Promise<{ message: string }> {
        const isNotFreeName = await this.prisma.file.findFirst({
            where: {
                userId: userId,
                name: folderName,
                directoryId: directoryId ?? null,
            },
        });

        if (isNotFreeName) {
            throw new BadRequestException('Name already exists.');
        }

        let directory: File;
        let folderPath: string;

        if (directoryId) {
            directory = await this.prisma.file.findUnique({
                where: { id: directoryId, userId: userId },
            });

            if (!directory) {
                throw new NotFoundException('Directory not found.');
            }

            if (!directory.isDirectory) {
                throw new BadRequestException('Is not a folder.');
            }

            folderPath = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                directory.path,
                folderName,
            );
        } else {
            folderPath = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                userId,
                'files',
                folderName,
            );
        }

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
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

        return { message: 'Folder created successfully.' };
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
        let fileSize = 0;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        const quota = user.storageQuota;
        const usedSpace = user.usedQuota;
        const remainingSpace = quota - usedSpace;

        if (directoryId) {
            directory = await this.prisma.file.findUnique({
                where: { id: directoryId, userId: userId },
            });

            if (!directory) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Directory not found.',
                });
            }

            if (!directory.isDirectory) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Is not a directory.',
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
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'Upload directory not found.',
            });
        }

        let uploadError = false;

        busboy.on('file', async (_, file, fileInfo) => {
            try {
                fileName = fileInfo.filename;

                const isNotFreeName = await this.prisma.file.findFirst({
                    where: {
                        userId: userId,
                        name: fileName,
                        directoryId: directoryId ?? null,
                    },
                });

                if (isNotFreeName) {
                    file.resume();
                    uploadError = true;

                    return res.status(HttpStatus.BAD_REQUEST).json({
                        message: 'The file name is already taken',
                    });
                }

                file.on('data', chunk => {
                    fileSize += chunk.length;
                    if (fileSize > remainingSpace) {
                        file.resume();
                        uploadError = true;

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
                    uploadError = true;

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                        message: 'Error uploading file.',
                    });
                });

                writeStream.on('finish', async () => {
                    try {
                        if (uploadError) return;

                        const filePath = directoryId
                            ? path.join(directory.path, fileName)
                            : path.join(userId, 'files', fileName);

                        const file = await this.prisma.file.create({
                            data: {
                                name: fileName,
                                userId: userId,
                                directoryId: directoryId ?? null,
                                size: fileSize,
                                mimeType: fileInfo.mimeType,
                                path: filePath,
                            },
                        });

                        const thumbnailPaths = await generateThumbnails(
                            userId,
                            file.id,
                            filePath,
                            this.config,
                        );

                        if (thumbnailPaths) {
                            await this.prisma.file.update({
                                where: { id: file.id },
                                data: {
                                    thumbnailLarge: thumbnailPaths[0],
                                    thumbnailMedium: thumbnailPaths[1],
                                    thumbnailSmall: thumbnailPaths[2],
                                },
                            });
                        }

                        await this.prisma.user.update({
                            where: { id: userId },
                            data: {
                                usedQuota: usedSpace + fileSize,
                            },
                        });
                    } catch (dbError) {
                        uploadError = true;
                        return res
                            .status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .json({
                                message:
                                    'Database error while saving file metadata.',
                                error: dbError,
                            });
                    }
                });

                writeStream.on('error', () => {
                    uploadError = true;
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                        message: 'Error writing file.',
                    });
                });
            } catch (error) {
                uploadError = true;
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'Error processing file upload.',
                    error: error,
                });
            }
        });

        busboy.on('finish', () => {
            if (!uploadError) {
                res.status(HttpStatus.OK).json({
                    message: 'File uploaded successfully.',
                    file: fileName,
                    size: fileSize,
                    path: uploadDir,
                });
            }
        });

        busboy.on('error', error => {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Error processing request.',
                error: error,
            });
        });

        req.pipe(busboy);
    }

    async getFile(
        userId: string,
        fileId: string,
        res: Response,
        filePathFunc?: (file: File) => string,
    ) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, userId: userId },
        });

        if (!file) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'File not found',
            });
        }

        const filePath = filePathFunc
            ? filePathFunc(file)
            : path.join(
                  this.config.getOrThrow<string>('STORAGE_PATH'),
                  file.path,
              );

        if (!fs.existsSync(filePath)) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'File not found',
            });
        }

        res.sendFile(filePath);
    }

    async getThumbnail(
        userId: string,
        fileId: string,
        size: 'small' | 'medium' | 'large',
        res: Response,
    ) {
        return this.getFile(userId, fileId, res, file => {
            const thumbnailPath = {
                small: file.thumbnailSmall,
                medium: file.thumbnailMedium,
                large: file.thumbnailLarge,
            }[size];

            return path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                thumbnailPath,
            );
        });
    }

    async rename(userId: string, fileId: string, name: string) {
        const file = await this.prisma.file
            .findUniqueOrThrow({
                where: { id: fileId },
            })
            .catch(() => {
                throw new NotFoundException('File or directory not found');
            });

        const oldPath: string = path.join(
            this.config.getOrThrow<string>('STORAGE_PATH'),
            file.path,
        );

        if (!file.isDirectory) {
            const newName = `${name}${path.extname(file.name)}`;
            const newPath = path.join(path.dirname(file.path), newName);

            const isNotFreeName = await this.prisma.file.findFirst({
                where: {
                    name: newName,
                    directoryId: file.directoryId,
                    userId: userId,
                    NOT: {
                        id: file.id,
                    },
                },
            });

            if (isNotFreeName) {
                throw new BadRequestException('Name already exists.');
            }

            fs.renameSync(
                oldPath,
                path.join(
                    this.config.getOrThrow<string>('STORAGE_PATH'),
                    newPath,
                ),
            );

            await this.prisma.file.update({
                where: {
                    id: file.id,
                },
                data: {
                    name: newName,
                    path: newPath,
                },
            });

            return { message: 'File renamed successfully.' };
        } else {
            const newPath = path.join(path.dirname(file.path), name);

            const isNotFreeName = await this.prisma.file.findFirst({
                where: {
                    name: name,
                    directoryId: file.directoryId,
                    userId: userId,
                    NOT: {
                        id: file.id,
                    },
                },
            });

            if (isNotFreeName) {
                throw new BadRequestException('Name already exists.');
            }

            const filesInDirectory = await this.prisma.file.findMany({
                where: {
                    directoryId: file.id,
                },
            });

            fs.renameSync(
                oldPath,
                path.join(
                    this.config.getOrThrow<string>('STORAGE_PATH'),
                    newPath,
                ),
            );

            await this.prisma.file.update({
                where: {
                    id: file.id,
                },
                data: {
                    name: name,
                    path: newPath,
                },
            });

            for (const file of filesInDirectory) {
                const newFilePath = path.join(
                    path.dirname(path.dirname(file.path)),
                    name,
                    path.basename(file.path),
                );

                await this.prisma.file.update({
                    where: {
                        id: file.id,
                    },
                    data: {
                        path: newFilePath,
                    },
                });
            }

            return { message: 'Directory renamed successfully.' };
        }
    }
}
