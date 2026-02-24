import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Configure Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ZanaFleet API')
    .setDescription('AI-accelerated, event-driven last-mile logistics platform for Africa')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'workspaceId',
        in: 'header',
        description: 'Workspace identifier for multi-tenancy',
      },
      'workspaceId'
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Health', 'System health check endpoints')
    .addTag('Media', 'Media asset management endpoints')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Businesses', 'Business management endpoints')
    .addTag('Customers', 'Customer management endpoints')
    .addTag('Riders', 'Rider management endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Deliveries', 'Delivery and tracking endpoints')
    .addTag('Quotes', 'Delivery quote endpoints')
    .addTag('Capabilities', 'Capability and permission management')
    .addTag('Workspaces', 'Workspace management endpoints')
    .addTag('Settlements', 'Settlement and payout endpoints')
    .addTag('Payments', 'Payment processing endpoints')
    .addTag('Wallets', 'Wallet and transaction endpoints')
    .addTag('Actors', 'Actor/personnel management endpoints')
    .addTag('Assets', 'Asset and equipment management endpoints')
    .addTag('Bundles', 'Asset bundle management endpoints')
    .addTag('Trips', 'Trip tracking endpoints')
    .addTag('Integrations', 'Third-party integration endpoints')
    .addTag('Notifications', 'Communication and notification endpoints')
    .addTag('Search', 'Global search endpoints')
    .addTag('Dashboard', 'Analytics and dashboard endpoints')
    .addTag('Operators', 'Operator management endpoints')
    .addTag('Movers', 'Moving service endpoints')
    .addTag('Saccos', 'Sacco (cooperative) management endpoints')
    .addTag('Geo', 'Location intelligence endpoints')
    .addTag('SignUp', 'User registration endpoints')
    .addTag('WooCommerce', 'WooCommerce integration endpoints')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em; }
    `,
    customSiteTitle: 'ZanaFleet API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

void bootstrap();
