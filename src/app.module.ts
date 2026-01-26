import { Module } from '@nestjs/common';
import { EventBusModule } from './core/event-bus';

/**
 * AppModule
 *
 * Root application module that configures global services.
 */
@Module({
  imports: [
    EventBusModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
