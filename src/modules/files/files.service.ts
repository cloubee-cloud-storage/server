import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaService } from '@/core/prisma/prisma.service';

import { File } from '../../../prisma/generated';

@Injectable()
export class FilesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    async getAll(userId: string, parentId?: string): Promise<File[]> {
        return this.prisma.file.findMany({
            where: {
                userId: userId,
                parentId: parentId ?? null,
            },
        });
    }

    async mkdir(
        userId: string,
        folderName: string,
        parentId?: string,
    ): Promise<string> {
        const isFreeName = await this.prisma.file.findFirst({
            where: {
                name: folderName,
                isFolder: true,
                parentId: parentId,
            },
        });

        if (isFreeName) {
            throw new ConflictException('Folder already exists');
        }

        if (parentId) {
            const parentFolder = await this.prisma.file.findUnique({
                where: { id: parentId },
            });

            if (!parentFolder || !parentFolder.isFolder) {
                throw new NotFoundException(
                    'Parent folder not found or is not a folder',
                );
            }

            const userFolder = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                parentFolder.path,
                folderName,
            );

            if (!fs.existsSync(userFolder)) {
                fs.mkdirSync(userFolder, { recursive: true });
            }

            await this.prisma.file.create({
                data: {
                    name: folderName,
                    userId: userId,
                    parentId: parentId,
                    size: 0,
                    path: path.join(parentFolder.path, folderName),
                    isFolder: true,
                },
            });
        } else {
            const userFolder = path.join(
                this.config.getOrThrow<string>('STORAGE_PATH'),
                userId,
                'files',
                folderName,
            );

            if (!fs.existsSync(userFolder)) {
                fs.mkdirSync(userFolder, { recursive: true });
            }

            await this.prisma.file.create({
                data: {
                    name: folderName,
                    userId: userId,
                    parentId: null,
                    size: 0,
                    path: path.join(userId, 'files', folderName),
                    isFolder: true,
                },
            });

            return userFolder;
        }
    }
}
