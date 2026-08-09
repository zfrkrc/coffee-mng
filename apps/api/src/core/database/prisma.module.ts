/**
 * Prisma client provider.
 *
 * A single shared PrismaClient instance per process is critical for
 * connection-pooling; a new client per request would exhaust Postgres
 * connections on a busy Edge box. The client also applies soft-delete and
 * tenant-scoping via explicit query args in services (no middleware magic).
 */
import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: () => {
        const client = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });
        return client;
      },
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
