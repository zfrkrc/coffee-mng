// @ts-nocheck — bridge module
import { Controller, Post, Body, HttpCode, HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA } from '../../core/database/prisma.module';
import { signAuthToken, verifyAuthToken } from '../../core/auth/token';
import { Inject } from '@nestjs/common';

// Shared secret with InsightMap (env).
const SHARED_SECRET = process.env.CAFEOS_SSO_SECRET || 'cafeos-sso-shared-secret-change-me';
const SSO_ISSUER = 'insightmap.tr';
const TTL = 300; // 5 min

interface InsightMapSSOPayload {
  user_id: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  tenant_role: string; // owner/admin/member
  product_tier: string; // STANDARD / AI_PRO
  iat: number;
  exp: number;
  iss: string;
}

@Controller('auth')
export class SSOController {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  @Post('sso')
  @HttpCode(200)
  async ssoHandoff(@Body() body: { token: string }) {
    if (!body.token) throw new HttpException('Token required', 400);

    let payload: InsightMapSSOPayload;
    try {
      payload = verifyAuthToken(body.token, SHARED_SECRET, SSO_ISSUER) as any;
    } catch {
      throw new HttpException('Invalid or expired SSO token', 401);
    }

    if (!payload.tenant_id || !payload.email) {
      throw new HttpException('Invalid token payload', 400);
    }

    // Entitlement check: must have CafeOS Standard or AI Pro
    if (payload.product_tier !== 'STANDARD' && payload.product_tier !== 'AI_PRO') {
      throw new HttpException('CafeOS ürününüz aktif değil. Lütfen yöneticinizle iletişime geçin.', 403);
    }

    // Find or create AccessMember
    let member = await this.db.accessMember.findFirst({
      where: { insightmapTenantId: payload.tenant_id },
    });

    if (!member) {
      // Create member from SSO
      const slug = `cafe-${payload.tenant_id.slice(0, 8)}`;
      member = await this.db.accessMember.create({
        data: {
          id: payload.tenant_id,
          email: payload.email,
          slug,
          displayName: payload.tenant_name || 'Cafe Müşterisi',
          domain: `${slug}.cafeos.local`,
          services: ['cafeos'],
          active: true,
          token: payload.tenant_id,
          insightmapTenantId: payload.tenant_id,
        },
      });

      // Create default branch
      await this.db.accessBranch.create({
        data: {
          id: `${payload.tenant_id}-main`,
          memberId: member.id,
          slug: 'main',
          name: 'Ana Şube',
          active: true,
        },
      });
    }

    // Map role: tenant owner → CafeOS owner, admin → manager, member → viewer
    const roleMap: Record<string, string> = {
      owner: 'owner',
      admin: 'manager',
      member: 'viewer',
    };
    const cafeRole = roleMap[payload.tenant_role] || 'viewer';

    // Issue CafeOS auth token
    const cafeToken = signAuthToken(
      {
        sub: member.id,
        email: payload.email,
        role: cafeRole,
        services: member.services,
        domain: member.domain,
        name: member.displayName,
      },
      SHARED_SECRET,
      'cafeos',
      TTL,
    );

    return {
      access_token: cafeToken,
      token_type: 'bearer',
      expires_in: TTL,
      member: {
        id: member.id,
        slug: member.slug,
        displayName: member.displayName,
        domain: member.domain,
        role: cafeRole,
      },
    };
  }
}