import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { AccessService } from './access.service';
import { AppError } from '@cafeos/shared';
import type { Request } from 'express';
import { API_ENV } from '../../core/config/config.module';
import type { ApiEnv } from '@cafeos/config';
import { signAuthToken, verifyAuthToken } from '../../core/auth/token';

const SERVICE_KEYS = ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'] as const;

class CreateMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsString()
  domain!: string;

  @IsString()
  @IsOptional()
  slug!: string;

  @IsArray()
  @IsIn(SERVICE_KEYS, { each: true })
  services!: Array<(typeof SERVICE_KEYS)[number]>;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  requestedBy!: string;
}

class UpdateServicesDto {
  @IsArray()
  @IsIn(SERVICE_KEYS, { each: true })
  services!: Array<(typeof SERVICE_KEYS)[number]>;

  @IsString()
  requestedBy!: string;
}

class SetActiveDto {
  @IsBoolean()
  active!: boolean;

  @IsString()
  requestedBy!: string;
}

class CreateStaffDto {
  @IsString()
  memberId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsIn(['admin', 'cashier', 'waiter', 'kitchen', 'viewer'])
  role!: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'viewer';

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  requestedBy!: string;
}

class StaffActiveDto {
  @IsString()
  staffId!: string;

  @IsBoolean()
  active!: boolean;

  @IsString()
  requestedBy!: string;
}

class LoginDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;
}

class SetPasswordDto {
  @IsString()
  password!: string;

  @IsString()
  requestedBy!: string;
}

@ApiTags('access')
@Controller('access')
export class AccessController {
  constructor(
    private readonly access: AccessService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('members')
  async members(@Query('requestedBy') requestedBy: string) {
    this.guardSuperadmin(requestedBy);
    return { items: await this.access.listMembers() };
  }

  @Post('members')
  async createMember(@Body() body: CreateMemberDto) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.createMember(body);
  }

  @Post('members/:memberId/services')
  async updateServices(@Param('memberId') memberId: string, @Body() body: UpdateServicesDto) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.updateMemberServices(memberId, body.services);
  }

  @Post('members/:memberId/token/rotate')
  async rotateToken(@Param('memberId') memberId: string, @Body() body: { requestedBy: string }) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.rotateMemberToken(memberId);
  }

  @Post('members/:memberId/active')
  async setMemberActive(@Param('memberId') memberId: string, @Body() body: SetActiveDto) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.setMemberActive(memberId, body.active);
  }

  @Get('members/:memberId/staff')
  async listStaff(@Param('memberId') memberId: string, @Query('requestedBy') requestedBy: string) {
    this.guardSuperadmin(requestedBy);
    return { items: await this.access.listStaff(memberId) };
  }

  @Post('staff')
  async createStaff(@Body() body: CreateStaffDto) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.createStaff(body.memberId, body);
  }

  @Post('staff/active')
  async setStaffActive(@Body() body: StaffActiveDto) {
    this.guardSuperadmin(body.requestedBy);
    return this.access.setStaffActive(body.staffId, body.active);
  }

  @Post('members/:memberId/password')
  async setMemberPassword(@Param('memberId') memberId: string, @Body() body: SetPasswordDto) {
    this.guardSuperadmin(body.requestedBy);
    await this.access.setMemberPassword(memberId, body.password);
    return { ok: true };
  }

  @Post('staff/:staffId/password')
  async setStaffPassword(@Param('staffId') staffId: string, @Body() body: SetPasswordDto) {
    this.guardSuperadmin(body.requestedBy);
    await this.access.setStaffPassword(staffId, body.password);
    return { ok: true };
  }

  @Post('login-host')
  async loginByHost(@Req() req: Request, @Body() body: LoginDto) {
    const domain = this.getRequestDomain(req);
    const principal = await this.access.loginWithDomain(domain, body.email, body.password);
    const token = signAuthToken(
      {
        sub: principal.memberId,
        email: principal.email,
        role: principal.role,
        services: principal.services,
        domain: principal.domain,
        name: principal.displayName,
      },
      this.env.JWT_SECRET,
      this.env.JWT_ISSUER,
      this.env.JWT_ACCESS_TTL_SECONDS,
    );
    return { token, user: principal };
  }

  @Get('me')
  me(@Req() req: Request) {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) throw AppError.forbidden('Missing bearer token');
    const token = auth.slice('Bearer '.length);
    const payload = verifyAuthToken(token, this.env.JWT_SECRET, this.env.JWT_ISSUER);
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      services: payload.services,
      domain: payload.domain,
      name: payload.name,
      exp: payload.exp,
    };
  }

  @Get('resolve')
  async resolveByToken(@Query('token') token: string) {
    return this.access.getAccessByToken(token);
  }

  @Get('resolve-route')
  async resolveByRoute(@Query('domain') domain: string, @Query('slug') slug: string) {
    return this.access.getAccessByDomainAndSlug(domain, slug);
  }

  @Get('resolve-host/:slug')
  async resolveByHost(@Param('slug') slug: string, @Req() req: Request) {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostValue = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost ?? req.headers.host ?? '');
    const domain = hostValue.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (!domain) throw AppError.validation('Host not found');
    return this.access.getAccessByDomainAndSlug(domain, slug);
  }

  @Get('resolve-host-root')
  async resolveHostRoot(@Req() req: Request) {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostValue = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost ?? req.headers.host ?? '');
    const domain = hostValue.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (!domain) throw AppError.validation('Host not found');
    return this.access.getMemberByDomain(domain);
  }

  private guardSuperadmin(requestedBy: string): void {
    if (!this.access.isSuperadmin(requestedBy)) {
      throw AppError.forbidden('only superadmin allowed');
    }
  }

  private getRequestDomain(req: Request): string {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostValue = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost ?? req.headers.host ?? '');
    const domain = hostValue.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (!domain) throw AppError.validation('Host not found');
    return domain;
  }
}
