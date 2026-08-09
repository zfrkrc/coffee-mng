import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { PrismaModule } from './core/database/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { CustomerModule } from './modules/customer/customer.module';
import { RequestLoggingMiddleware } from './core/middleware/request-logging.middleware';

/**
 * Root module — modular monolith.
 *
 * Domain modules are added here as they ship (auth, tenant, floor, menu,
 * orders, payments, inventory, reports, ...). Keeping them all in one process
 * is deliberate: a single Edge box must stay lightweight and offline-first.
 */
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, HealthModule, CustomerModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
