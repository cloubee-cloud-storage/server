import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { CoreModule } from './core/core.module';

async function bootstrap() {
    const app = await NestFactory.create(CoreModule);

    const config = app.get(ConfigService);

    app.enableCors({
        origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
        credentials: true,
        exposedHeaders: ['set-cookie'],
    });

    app.useGlobalPipes(new ValidationPipe());
    app.useLogger(new Logger());

    const swagger = new DocumentBuilder()
        .setTitle('Cloubee')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const documentFactory = SwaggerModule.createDocument(app, swagger);

    SwaggerModule.setup('swagger', app, documentFactory, {
        jsonDocumentUrl: 'swagger/yaml',
    });

    await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

bootstrap();
