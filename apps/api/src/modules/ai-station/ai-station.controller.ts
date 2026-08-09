import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiStationService } from './ai-station.service';
import type { Request } from 'express';
import { AppError } from '@cafeos/shared';
import { API_ENV } from '../../core/config/config.module';
import type { ApiEnv } from '@cafeos/config';
import { verifyAuthToken } from '../../core/auth/token';
import { Inject } from '@nestjs/common';

@ApiTags('ai-station')
@Controller('ai-station')
export class AiStationController {
  constructor(
    private readonly aiStation: AiStationService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('snapshot')
  snapshot(@Req() req: Request) {
    return this.aiStation.getSnapshot(this.getRequestDomain(req));
  }

  private getRequestDomain(req: Request): string {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostValue = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost ?? req.headers.host ?? '');
    const host = hostValue.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (!host) throw AppError.validation('Host not found');

    const auth = req.headers.authorization ?? '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length);
      try {
        const payload = verifyAuthToken(token, this.env.JWT_SECRET, this.env.JWT_ISSUER);
        if (payload.branch?.slug) return `${host}::${payload.branch.slug}`;
      } catch {
        return host;
      }
    }

    const branchFromQuery = req.query.branch;
    if (typeof branchFromQuery === 'string' && branchFromQuery.trim()) {
      return `${host}::${branchFromQuery.trim().toLowerCase()}`;
    }

    return host;
  }
}
