import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { CoreModule } from './core/core.module';

async function bootstrap() {
    const app = await NestFactory.create(CoreModule);

    const config = app.get(ConfigService);

    app.enableCors({
        origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
        credentials: true,
        exposedHeaders: ['set-cookie'],
    });

    await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}
bootstrap();
