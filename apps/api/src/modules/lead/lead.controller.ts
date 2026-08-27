import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { AppError } from '@cafeos/shared';
import type { ApiEnv } from '@cafeos/config';
import type { Request } from 'express';
import { API_ENV } from '../../core/config/config.module';

/**
 * Public satış sitesi (cafeos.zk.net.tr) teklif/lead formu.
 *
 * - Sunucu tarafında Telegram Bot API'ye bildirim gönderir (chat id env'den).
 * - honeypot (gizli alan) + basit in-memory rate-limit (60 sn/IP) — Redis YOK.
 * - DB/Prisma'ya dokunmaz (mevcut `leads` tablosu ayrı akıştadır).
 */
interface LeadBody {
  name?: string;
  phone?: string;
  business?: string;
  branch?: string;
  package?: string;
  note?: string;
  /** honeypot — botların doldurduğu gizli alan; insan boş bırakır. */
  website?: string;
}

const rateLimit = new Map<string, number>();

function normalizeTrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('90')) normalized = normalized.slice(2);
  else if (normalized.startsWith('0')) normalized = normalized.slice(1);
  return /^5\d{9}$/.test(normalized) ? normalized : null;
}

@Controller('lead')
export class LeadController {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  @Post()
  async createLead(@Body() body: LeadBody, @Req() req: Request) {
    // honeypot: gizli alan doluysa bot — sessizce kabul et (spam'e yanıt yok).
    if (body?.website && String(body.website).trim() !== '') {
      return { ok: true };
    }

    const name = (body?.name ?? '').trim();
    const phone = (body?.phone ?? '').trim();
    const business = (body?.business ?? '').trim();
    const branch = (body?.branch ?? '').trim() || '-';
    const pkg = (body?.package ?? '').trim() || '-';
    const note = (body?.note ?? '').trim();

    if (!name) throw AppError.validation('Ad Soyad gerekli');
    if (!business) throw AppError.validation('İşletme adı gerekli');
    const normalizedPhone = normalizeTrPhone(phone);
    if (!normalizedPhone) throw AppError.validation('Geçerli bir telefon numarası girin');

    // rate-limit: aynı IP'den 60 sn içinde ikinci istek engellenir.
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || 'unknown';
    const now = Date.now();
    const last = rateLimit.get(ip) ?? 0;
    if (now - last < 60_000) {
      throw AppError.validation('Çok fazla istek — lütfen bir dakika sonra tekrar deneyin');
    }
    rateLimit.set(ip, now);

    await this.sendToQuoteService({ name, phone, business, branch, pkg, note });

    return { ok: true };
  }

  /**
   * CafeOS teklif talebini zaferkaraca.net Teklif Sihirbazı'na iletir.
   * Sihirbaz otomatik e-posta (sözleşme PDF + detay) gönderir — ayrı mail/Telegram YOK.
   */
  private async sendToQuoteService(lead: {
    name: string;
    phone: string;
    business: string;
    branch: string;
    pkg: string;
    note: string;
  }): Promise<void> {
    const base = this.env.QUOTE_SERVICE_URL.replace(/\/$/, '');
    const noteParts = [
      `CafeOS Teklif Talebi — İşletme: ${lead.business}`,
      `Şube sayısı: ${lead.branch}`,
      `Paket: ${lead.pkg}`,
    ];
    if (lead.note) noteParts.push(`Not: ${lead.note}`);

    try {
      await fetch(`${base}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: 'cafeos-lead@zaferkaraca.net',
          phone: lead.phone,
          notes: noteParts.join('\n'),
          items: [{
            service_name: `CafeOS ${lead.pkg}`,
            service_count: 1,
            timeline: '-',
            estimated_total: 0,
            currency: 'TRY',
          }],
          extras: [],
          estimated_total: 0,
          currency: 'TRY',
          agreement_accepted: false,
        }),
      });
    } catch {
      // Teklif Sihirbazı erişilemezse lead kaybolmasın — hatayı yutup ok dön (fail-open).
    }
  }
}
