import 'reflect-metadata';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { envs } from './config/envs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');

  // CORS solo si se configuraron origenes (p. ej. el frontend servido aparte).
  if (envs.origenesCors.length > 0) {
    app.enableCors({ origin: envs.origenesCors, methods: ['GET', 'POST'] });
  }

  // Interfaz web de demostracion (archivos estaticos, sin secretos).
  app.useStaticAssets(join(__dirname, '..', 'frontend'), { index: 'index.html' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  await app.listen(envs.puerto);
  logger.log(`API escuchando en http://localhost:${envs.puerto}`);
}

void bootstrap();
