import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { StructuredLoggingInterceptor } from './core/api/interceptors/structured-logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs for structured output
  });

  // Enable CORS to allow frontend (localhost:3001) and WooCommerce stores to communicate with API (localhost:3000)
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Enable API versioning for WooCommerce compatibility
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Apply structured logging interceptor globally
  app.useGlobalInterceptors(app.get(StructuredLoggingInterceptor));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log('Structured logging enabled with multi-tenant context');
}

void bootstrap();
