import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as sharp from 'sharp';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const VIDEO_EXTENSIONS = [
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.flv',
    '.wmv',
    '.mpeg',
    '.mpg',
    '.3gp',
    '.m4v',
];

export const generateThumbnails = async (
    userId: string,
    fileId: string,
    filePath: string,
    config: ConfigService,
) => {
    try {
        let fullFilePath = path.join(
            config.getOrThrow<string>('STORAGE_PATH'),
            filePath,
        );

        const thumbnailDir = path.join(
            config.getOrThrow<string>('STORAGE_PATH'),
            userId,
            'thumbnails',
        );

        const sizes = [
            { width: 120, name: 'large' },
            { width: 80, name: 'medium' },
            { width: 40, name: 'small' },
        ];

        const thumbnailPaths = [];
        const ext = path.extname(filePath).toLowerCase();
        const isVideo = VIDEO_EXTENSIONS.includes(ext);

        if (isVideo) {
            const screenshotName = `screenshot_${fileId}.jpg`;

            await new Promise((resolve, reject) => {
                ffmpeg(fullFilePath)
                    .on('end', resolve)
                    .on('error', reject)
                    .screenshots({
                        timestamps: ['50%'],
                        filename: screenshotName,
                        folder: thumbnailDir,
                        size: '100%',
                    });
            });

            fullFilePath = path.join(thumbnailDir, screenshotName);
        }

        for (const size of sizes) {
            const thumbnailPath = path.join(
                thumbnailDir,
                isVideo
                    ? `${size.name}_${fileId}.jpg`
                    : `${size.name}_${fileId}${path.extname(filePath)}`,
            );

            await sharp(fullFilePath).resize(size.width).toFile(thumbnailPath);

            thumbnailPaths.push(thumbnailPath);
        }

        if (isVideo) {
            await fs.promises.rm(path.join(fullFilePath));
        }

        return thumbnailPaths;
    } catch {
        return null;
    }
};
