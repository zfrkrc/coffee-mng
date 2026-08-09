/**
 * Health endpoints.
 *
 *  /api/health/live   — liveness: process is up (no dependencies checked).
 *  /api/health/ready  — readiness: process + DB + Redis reachable.
 *
 * Docker compose uses /live for container health checks. The readiness probe
 * is what orchestrators / the node-agent poll before routing traffic.
 */
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PRISMA } from '../../core/database/prisma.module';
import { REDIS } from '../../core/redis/redis.module';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { AppError } from '@cafeos/shared';
import { API_ENV } from '../../core/config/config.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(API_ENV) private readonly env: { LOG_LEVEL?: string },
  ) {}

  private get version(): string {
    return process.env.npm_package_version ?? '0.1.0';
  }

  private base(components: Record<string, { status: string; detail?: string }>) {
    const status = Object.values(components).some((c) => c.status === 'down')
      ? 'down'
      : Object.values(components).some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'ok';
    return {
      status,
      version: this.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      components,
    };
  }

  @Get('live')
  live() {
    return this.base({ process: { status: 'ok' } });
  }

  @Get('ready')
  async ready() {
    const components: Record<string, { status: string; detail?: string }> = {};

    // Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      components.database = { status: 'ok' };
    } catch (err) {
      components.database = {
        status: 'down',
        detail: err instanceof Error ? err.message.slice(0, 200) : 'database unreachable',
      };
    }

    // Redis — non-fatal for readiness in offline-tolerant design, but report it.
    try {
      await this.redis.ping();
      components.redis = { status: 'ok' };
    } catch {
      components.redis = { status: 'degraded', detail: 'redis unreachable (cache only)' };
    }

    return this.base(components);
  }

  @Get('version')
  versionInfo() {
    return {
      app: 'cafeos-edge-api',
      version: this.version,
      node: process.version,
      logLevel: this.env.LOG_LEVEL ?? 'info',
    };
  }

  @Get('deep')
  async deep() {
    // Used by tests / support to force-check dependency health in one shot.
    const ready = await this.ready();
    if (ready.status === 'down') {
      throw AppError.internal(`dependencies degraded: ${JSON.stringify(ready.components)}`);
    }
    return ready;
  }
}
