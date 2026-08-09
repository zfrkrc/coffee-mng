/**
 * CafeOS Edge API bootstrap.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { loadConfig, apiEnvSchema } from '@cafeos/config';
import { Logger } from '@cafeos/shared';

async function bootstrap(): Promise<void> {
  const env = loadConfig(apiEnvSchema);
  const logger = new Logger({ nodeId: env.NODE_ID, level: env.LOG_LEVEL });

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers (no public inbound SSH; HTTPS terminäted at web/nginx).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Strict CORS: only the web app origins may call the API.
  const origins = env.WEB_ORIGINS.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  app.setGlobalPrefix('api');

  // Centralized validation for all DTOs (whitelist strips unknown fields).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (env.ENABLE_SWAGGER) {
    const doc = new DocumentBuilder()
      .setTitle('CafeOS Edge API')
      .setDescription('Offline-first cafe management platform')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, doc);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = env.PORT;
  await app.listen(port, '0.0.0.0');
  logger.info(`cafeos-edge-api listening on :${port}`, { nodeId: env.NODE_ID });
}

bootstrap().catch((err) => {
  const logger = new Logger({ nodeId: 'cafe-api' });
  logger.error('failed to start cafeos-edge-api', { detail: err.message });
  process.exit(1);
});
