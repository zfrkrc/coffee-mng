import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerService } from './customer.service';
import { TelegramNotifyService } from './telegram-notify.service';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { API_ENV } from '../../core/config/config.module';
import type { ApiEnv } from '@cafeos/config';
import { verifyAuthToken } from '../../core/auth/token';
import { AppError } from '@cafeos/shared';
import { PRISMA } from '../../core/database/prisma.module';
import type { PrismaClient } from '@prisma/client';

class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class CreateOrderDto {
  @IsString()
  tableCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  branchSlug?: string;
}

class UpdateOrderDto {
  @IsString()
  tableCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  branchSlug?: string;
}

class UpsertMenuItemDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  category!: 'coffee' | 'tea' | 'food' | 'dessert';

  @IsInt()
  @Min(1)
  priceCents!: number;

  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class AdjustInventoryDto {
  @IsInt()
  delta!: number;
}

class UpsertTableDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

class CloseAccountDto {
  @IsString()
  paymentMethod!: 'cash' | 'card';

  @IsOptional()
  @IsString()
  branchSlug?: string;
}

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customer: CustomerService,
    private readonly telegram: TelegramNotifyService,
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  @Post('leads')
  async createLead(@Body() body: Record<string, string>) {
    const name = (body?.name ?? '').trim();
    const email = (body?.email ?? '').trim().toLowerCase();
    if (!name || !email) throw AppError.validation('name and email required', body);
    const lead = await this.prisma.lead.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        phone: body?.phone?.trim() || null,
        site: body?.site?.trim() || null,
        note: body?.note?.trim() || null,
      },
    });
    return { ok: true, id: lead.id };
  }

  @Get('tables')
  tables(@Req() req: Request) {
    const domain = this.getRequestDomain(req);
    const branchSlug = this.getBranchSlug(req);
    const proto = req.headers['x-forwarded-proto']?.toString() ?? req.protocol;
    const host = req.headers['x-forwarded-host']?.toString() ?? req.get('host') ?? 'localhost:3003';
    const baseUrl = `${proto}://${host}`;
    return { items: this.customer.getTables(domain, baseUrl, branchSlug) };
  }

  @Get('menu')
  menu(@Req() req: Request) {
    const domain = this.getRequestDomain(req);
    return { items: this.customer.getMenu(domain) };
  }

  @Post('admin/menu')
  upsertMenu(@Body() body: UpsertMenuItemDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.upsertMenuItem(this.getRequestDomain(req), body);
  }

  @Post('admin/menu/:itemId/delete')
  deleteMenu(@Param('itemId') itemId: string, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    this.customer.deleteMenuItem(this.getRequestDomain(req), itemId);
    return { ok: true };
  }

  @Get('admin/inventory')
  inventory(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return { items: this.customer.getInventory(this.getRequestDomain(req)) };
  }

  @Post('admin/inventory/:productId/adjust')
  adjustInventory(@Param('productId') productId: string, @Body() body: AdjustInventoryDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.adjustInventory(this.getRequestDomain(req), productId, body.delta);
  }

  @Get('admin/overview')
  overview(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.getOverview(this.getRequestDomain(req));
  }

  @Get('admin/reports/daily')
  dailyReport(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.getDailyReport(this.getRequestDomain(req));
  }

  @Post('admin/tables')
  upsertTable(@Body() body: UpsertTableDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.upsertTable(this.getRequestDomain(req), body);
  }

  @Post('admin/tables/:tableCode/delete')
  deleteTable(@Param('tableCode') tableCode: string, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    this.customer.deleteTable(this.getRequestDomain(req), tableCode);
    return { ok: true };
  }

  @Post('orders')
  async createOrder(@Body() body: CreateOrderDto, @Req() req: Request) {
    const domain = this.getRequestDomain(req);
    const order = this.customer.createOrder(domain, body);
    await this.telegram.notifyByDomain(
      domain,
      `<b>Yeni Siparis</b>\nMasa: ${order.tableName} (${order.tableCode})\nTutar: ${Math.round(order.totalCents / 100)} TL\nNo: ${order.id.slice(0, 8)}`,
    );
    return order;
  }

  @Get('kitchen/orders')
  kitchenOrders(@Req() req: Request) {
    this.requireService(req, 'kitchen-board');
    return { items: this.customer.getKitchenOrders(this.getRequestDomain(req)) };
  }

  @Post('kitchen/orders/:orderId/advance')
  async advanceOrder(@Param('orderId') orderId: string, @Req() req: Request) {
    this.requireService(req, 'kitchen-board');
    const domain = this.getRequestDomain(req);
    const order = this.customer.advanceOrder(domain, orderId);
    await this.telegram.notifyByDomain(
      domain,
      `<b>Siparis Durumu</b>\nMasa: ${order.tableName} (${order.tableCode})\nDurum: ${order.status}\nNo: ${order.id.slice(0, 8)}`,
    );
    return order;
  }

  @Post('kitchen/orders/:orderId/edit')
  async editOrder(@Param('orderId') orderId: string, @Body() body: UpdateOrderDto, @Req() req: Request) {
    this.requireService(req, 'kitchen-board');
    const domain = this.getRequestDomain(req);
    const order = this.customer.updateOrder(domain, orderId, body);
    return order;
  }

  @Get('orders/:orderId')
  getOrder(@Param('orderId') orderId: string, @Req() req: Request) {
    return this.customer.getOrder(this.getRequestDomain(req), orderId);
  }

  @Get('account/:tableCode')
  getAccount(@Param('tableCode') tableCode: string, @Req() req: Request) {
    const account = this.customer.getAccountByTable(this.getRequestDomain(req), tableCode);
    if (!account) throw AppError.notFound('No open account for this table');
    return account;
  }

  @Post('account/:tableCode/open')
  openAccount(@Param('tableCode') tableCode: string, @Req() req: Request) {
    return this.customer.openAccount(this.getRequestDomain(req), tableCode);
  }

  @Post('account/:tableCode/request')
  async requestAccount(@Param('tableCode') tableCode: string, @Req() req: Request) {
    const domain = this.getRequestDomain(req);
    const account = this.customer.requestAccount(domain, tableCode);
    await this.telegram.notifyByDomain(
      domain,
      `<b>Hesap Iste</b>\nMasa: ${account.tableName} (${account.tableCode})\nTutar: ${Math.round(account.totalCents / 100)} TL`,
    );
    return account;
  }

  @Post('account/:tableCode/close')
  async closeAccount(
    @Param('tableCode') tableCode: string,
    @Body() body: CloseAccountDto,
    @Req() req: Request,
  ) {
    const domain = this.getRequestDomain(req);
    const account = this.customer.closeAccount(domain, tableCode, body.paymentMethod);
    await this.telegram.notifyByDomain(
      domain,
      `<b>Hesap Kapandi</b>\nMasa: ${account.tableName} (${account.tableCode})\nTutar: ${Math.round(account.totalCents / 100)} TL\nOdeme: ${body.paymentMethod === 'cash' ? 'Nakit' : 'Kart'}`,
    );
    return account;
  }

  @Get('accounts')
  accounts(@Req() req: Request) {
    return { items: this.customer.getTableAccounts(this.getRequestDomain(req)) };
  }

  private requireService(req: Request, service: string): void {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) throw AppError.forbidden('Missing bearer token');
    const token = auth.slice('Bearer '.length);
    const payload = verifyAuthToken(token, this.env.JWT_SECRET, this.env.JWT_ISSUER);
    if (!payload.services.includes(service)) throw AppError.forbidden(`Missing service access: ${service}`);
    if (!this.roleAllowsService(payload.role, service)) {
      throw AppError.forbidden(`Role ${payload.role} cannot access ${service}`);
    }
  }

  private roleAllowsService(role: string, service: string): boolean {
    const rules: Record<string, string[]> = {
      owner: ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'],
      admin: ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'],
      cashier: ['customer-order', 'ops-dashboard'],
      waiter: ['customer-order', 'kitchen-board'],
      kitchen: ['kitchen-board'],
      viewer: ['customer-order'],
    };
    const allowed = rules[role] ?? [];
    return allowed.includes(service);
  }

  private getRequestDomain(req: Request): string {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostValue = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost ?? req.headers.host ?? '');
    const host = hostValue.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || 'localhost';

    const branch = this.getBranchSlug(req);
    return branch ? `${host}::${branch}` : host;
  }

  private getBranchSlug(req: Request): string | null {
    const auth = req.headers.authorization ?? '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length);
      try {
        const payload = verifyAuthToken(token, this.env.JWT_SECRET, this.env.JWT_ISSUER);
        if (payload.branch?.slug) return payload.branch.slug;
      } catch {
        return null;
      }
    }

    const branchFromQuery = req.query.branch;
    if (typeof branchFromQuery === 'string' && branchFromQuery.trim()) return branchFromQuery.trim().toLowerCase();

    const body = req.body as { branchSlug?: unknown } | undefined;
    if (body && typeof body.branchSlug === 'string' && body.branchSlug.trim()) {
      return body.branchSlug.trim().toLowerCase();
    }

    const headerBranch = req.headers['x-cafe-branch'];
    if (typeof headerBranch === 'string' && headerBranch.trim()) return headerBranch.trim().toLowerCase();

    return null;
  }

  @Get('qr/:tableCode')
  async qr(@Param('tableCode') tableCode: string, @Req() req: Request, @Res() res: Response) {
    const domain = this.getRequestDomain(req);
    const branch = this.getBranchSlug(req);
    const table = this.customer.tableByCode(domain, tableCode.toUpperCase());
    const proto = req.headers['x-forwarded-proto']?.toString() ?? req.protocol;
    const host = req.headers['x-forwarded-host']?.toString() ?? req.get('host') ?? 'localhost:3003';
    const branchQuery = branch ? `&branch=${encodeURIComponent(branch)}` : '';
    const target = `${proto}://${host}/m?table=${table.code}${branchQuery}`;
    const targetLabel = this.escapeXml(target);

    const qrDataUrl = await QRCode.toDataURL(target, {
      type: 'image/png',
      margin: 1,
      width: 560,
      errorCorrectionLevel: 'M',
    });

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="460" viewBox="0 0 420 460">
  <rect width="420" height="460" fill="#f8fafc"/>
  <rect x="20" y="20" width="380" height="420" rx="20" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="210" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">CafeOS ${table.name}</text>
  <text x="210" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569">QR okut ve siparis ver</text>
  <image x="70" y="126" width="280" height="280" href="${qrDataUrl}"/>
  <text x="210" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${targetLabel}</text>
</svg>`;
    res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
