import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { CoreModule } from './core/core.module';

async function bootstrap() {
    const app = await NestFactory.create(CoreModule);

    const config = app.get(ConfigService);

    const swagger = new DocumentBuilder()
        .setTitle('Cloubee')
        .setVersion('1.0')
        .build();

    const documentFactory = () => SwaggerModule.createDocument(app, swagger);

    SwaggerModule.setup('swagger', app, documentFactory);

    app.enableCors({
        origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
        credentials: true,
        exposedHeaders: ['set-cookie'],
    });

    await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}
bootstrap();
