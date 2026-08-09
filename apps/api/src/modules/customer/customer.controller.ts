import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerService } from './customer.service';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { API_ENV } from '../../core/config/config.module';
import type { ApiEnv } from '@cafeos/config';
import { verifyAuthToken } from '../../core/auth/token';
import { AppError } from '@cafeos/shared';

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

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customer: CustomerService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('tables')
  tables(@Req() req: Request) {
    const proto = req.headers['x-forwarded-proto']?.toString() ?? req.protocol;
    const host = req.headers['x-forwarded-host']?.toString() ?? req.get('host') ?? 'localhost:3003';
    const baseUrl = `${proto}://${host}`;
    return { items: this.customer.getTables(baseUrl) };
  }

  @Get('menu')
  menu() {
    return { items: this.customer.getMenu() };
  }

  @Post('admin/menu')
  upsertMenu(@Body() body: UpsertMenuItemDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.upsertMenuItem(body);
  }

  @Post('admin/menu/:itemId/delete')
  deleteMenu(@Param('itemId') itemId: string, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    this.customer.deleteMenuItem(itemId);
    return { ok: true };
  }

  @Get('admin/inventory')
  inventory(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return { items: this.customer.getInventory() };
  }

  @Post('admin/inventory/:productId/adjust')
  adjustInventory(@Param('productId') productId: string, @Body() body: AdjustInventoryDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.adjustInventory(productId, body.delta);
  }

  @Get('admin/overview')
  overview(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.getOverview();
  }

  @Get('admin/reports/daily')
  dailyReport(@Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.getDailyReport();
  }

  @Post('admin/tables')
  upsertTable(@Body() body: UpsertTableDto, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    return this.customer.upsertTable(body);
  }

  @Post('admin/tables/:tableCode/delete')
  deleteTable(@Param('tableCode') tableCode: string, @Req() req: Request) {
    this.requireService(req, 'ops-dashboard');
    this.customer.deleteTable(tableCode);
    return { ok: true };
  }

  @Post('orders')
  createOrder(@Body() body: CreateOrderDto) {
    return this.customer.createOrder(body);
  }

  @Get('kitchen/orders')
  kitchenOrders(@Req() req: Request) {
    this.requireService(req, 'kitchen-board');
    return { items: this.customer.getKitchenOrders() };
  }

  @Post('kitchen/orders/:orderId/advance')
  advanceOrder(@Param('orderId') orderId: string, @Req() req: Request) {
    this.requireService(req, 'kitchen-board');
    return this.customer.advanceOrder(orderId);
  }

  @Get('orders/:orderId')
  getOrder(@Param('orderId') orderId: string) {
    return this.customer.getOrder(orderId);
  }

  private requireService(req: Request, service: string): void {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) throw AppError.forbidden('Missing bearer token');
    const token = auth.slice('Bearer '.length);
    const payload = verifyAuthToken(token, this.env.JWT_SECRET, this.env.JWT_ISSUER);
    if (!payload.services.includes(service)) throw AppError.forbidden(`Missing service access: ${service}`);
  }

  @Get('qr/:tableCode')
  async qr(@Param('tableCode') tableCode: string, @Req() req: Request, @Res() res: Response) {
    const table = this.customer.tableByCode(tableCode.toUpperCase());
    const proto = req.headers['x-forwarded-proto']?.toString() ?? req.protocol;
    const host = req.headers['x-forwarded-host']?.toString() ?? req.get('host') ?? 'localhost:3003';
    const target = `${proto}://${host}/m?table=${table.code}`;

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
  <text x="210" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${target}</text>
</svg>`;
    res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  }
}
