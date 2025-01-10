import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as process from 'node:process';

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

    app.use(
        '/reference',
        apiReference({
            layout: 'classic',
            theme: 'default',
            metaData: {
                title: 'Cloubee API',
            },
            defaultHttpClient: {
                targetKey: 'js',
                clientKey: 'axios',
            },
            authentication: {
                preferredSecurityScheme: 'bearer',
                http: {
                    bearer: {
                        token: process.env.SCALAR_BEARER,
                    },
                },
            },
            spec: {
                content: documentFactory,
            },
        }),
    );

    await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

bootstrap();
