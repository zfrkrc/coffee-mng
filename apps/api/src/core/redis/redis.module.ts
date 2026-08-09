/**
 * Redis connection provider (ioredis).
 *
 * Used for ephemeral state: refresh-token allowlist, rate limiting counters,
 * pub/sub for cross-instance realtime fan-out, and lightweight caching.
 * Redis is never the source of truth for business data.
 */
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { API_ENV } from '../config/config.module';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [API_ENV],
      useFactory: (env: { REDIS_URL: string }) => {
        const client = new Redis(env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: (times: number) => Math.min(times * 200, 2000),
        });
        client.on('error', (err) => {
          // Non-fatal: cache/ephemeral layer. Log and continue.
          console.error('[redis] connection error', err.message);
        });
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
