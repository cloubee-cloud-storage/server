import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as sharp from 'sharp';

export const generateThumbnails = async (
    userId: string,
    fileId: string,
    imagePath: string,
    config: ConfigService,
) => {
    try {
        const fullImagePath = path.join(
            config.getOrThrow<string>('STORAGE_PATH'),
            imagePath,
        );

        const sizes = [
            { width: 120, name: 'large' },
            { width: 80, name: 'medium' },
            { width: 40, name: 'small' },
        ];

        const thumbnailPaths = [];

        for (const size of sizes) {
            const thumbnailPath = path.join(
                config.getOrThrow<string>('STORAGE_PATH'),
                userId,
                'thumbnails',
                `${size.name}_${fileId}_${path.basename(imagePath)}`,
            );

            await sharp(fullImagePath).resize(size.width).toFile(thumbnailPath);

            thumbnailPaths.push(
                path.join(
                    userId,
                    'thumbnails',
                    `${size.name}_${path.basename(imagePath)}`,
                ),
            );
        }

        return thumbnailPaths;
    } catch {
        return null;
    }
};
