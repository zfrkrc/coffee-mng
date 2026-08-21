// @ts-nocheck — async migration
// @ts-nocheck — persistence migration; async methods need await
import { Injectable, Logger } from '@nestjs/common';
import { CustomerService } from '../customer/customer.service';
import type { AiStationForecast, AiStationRecommendation, AiStationSnapshot, AiStationSummary } from './ai-station.types';
import { AiUsageService, type AiUsageRecord } from './ai-usage.service';
import { AiGatewayClient } from './ai-gateway.client';

@Injectable()
export class AiStationService {
  private readonly logger = new Logger(AiStationService.name);

  constructor(
    private readonly customer: CustomerService,
    private readonly aiUsage: AiUsageService,
    private readonly gateway: AiGatewayClient,
  ) {}

  async getSnapshot(domain: string): Promise<AiStationSnapshot & { usage: AiUsageRecord }> {
    const overview = this.customer.getOverview(domain);
    const report = this.customer.getDailyReport(domain);
    const inventory = this.customer.getInventory(domain);

    const recommendations: AiStationRecommendation[] = [];

    const lowStock = inventory.filter((item) => item.stock <= item.threshold);
    if (lowStock.length > 0) {
      recommendations.push({
        id: 'restock-low',
        title: 'Kritik stoklari tamamla',
        detail: `${lowStock.length} urun kritik esikte. Once yuksek devirli urunleri tamamlayin.`,
        priority: 'high',
        category: 'inventory',
      });
    }

    if (report.orderCount === 0) {
      recommendations.push({
        id: 'boost-sales',
        title: 'Satis hareketi dusuk',
        detail: 'Gunluk siparis yok. Masa yonlendirme ve kampanya kartlarini kontrol edin.',
        priority: 'high',
        category: 'sales',
      });
    } else if (report.averageOrderCents < 14000) {
      recommendations.push({
        id: 'increase-ticket',
        title: 'Ortalama sepeti yukselt',
        detail: 'Tatli veya yan urun capraz satisiyla sepet ortalamasini arttirin.',
        priority: 'medium',
        category: 'sales',
      });
    }

    if (overview.openOrders > 6) {
      recommendations.push({
        id: 'kitchen-load',
        title: 'Mutfak yogunlugu yuksek',
        detail: `Acik siparis sayisi ${overview.openOrders}. Hazirlama kuyruğunu mutfak panelinden dengele.`,
        priority: 'medium',
        category: 'operations',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'steady-state',
        title: 'Operasyon dengeli',
        detail: 'Anomali gorunmuyor. Servis hizi ve stok seviyesini bu ritimde koruyun.',
        priority: 'low',
        category: 'operations',
      });
    }

    const forecasts = this.buildForecasts(report, inventory);
    const summary = this.buildSummary(overview.openOrders, lowStock.length, report.orderCount);
    const completionText = JSON.stringify({ summary, recommendations, forecasts });
    const usage = await this.aiUsage.record({
      domainKey: domain,
      promptText: `ai_station_snapshot ${domain}`,
      completionText,
    });

    return {
      generatedAt: new Date().toISOString(),
      summary,
      recommendations,
      forecasts,
      usage,
    };
  }

  getUsageAggregate(hours: number) {
    return this.aiUsage.getAggregate(hours);
  }

  async getManagementSummary(domain: string): Promise<{ summary: string; source: 'ai' | 'deterministic' }> {
    // Deterministik veri önce Cafe'nin kendi servislerinden üretilir — AI yalnızca yorumlar.
    const overview = this.customer.getOverview(domain);
    const report = this.customer.getDailyReport(domain);
    const deterministic = this.buildSummary(overview.openOrders, overview.lowStockCount, report.orderCount);

    if (!this.gateway.enabled) {
      return { summary: deterministic.message, source: 'deterministic' };
    }

    try {
      const summary = await this.gateway.managementSummary(
        {
          open_orders: overview.openOrders,
          order_count: report.orderCount,
          average_order_cents: report.averageOrderCents,
          low_stock_count: overview.lowStockCount,
          total_revenue_cents: overview.totalRevenueCents,
          top_products: (report.topProducts || []).map((p) => ({ name: p.name, qty: p.qty })),
          deterministic_summary: deterministic.message,
        },
        domain,
      );
      if (summary) {
        return { summary, source: 'ai' };
      }
    } catch (err) {
      this.logger.warn(`AI yönetici özeti başarısız, deterministik fallback: ${(err as Error).message}`);
    }
    return { summary: deterministic.message, source: 'deterministic' };
  }

  private buildForecasts(
    report: ReturnType<CustomerService['getDailyReport']>,
    inventory: ReturnType<CustomerService['getInventory']>,
  ): AiStationForecast[] {
    const top = report.topProducts.length > 0 ? report.topProducts : inventory.slice(0, 3).map((i) => ({ productId: i.productId, name: i.productName, qty: 2 }));
    return top.slice(0, 5).map((p) => {
      const base = Math.max(3, Math.round(p.qty * 1.25));
      return {
        productId: p.productId,
        productName: p.name,
        forecastQty: base,
        confidence: Math.min(0.92, 0.55 + p.qty / 30),
      };
    });
  }

  private buildSummary(openOrders: number, lowStockCount: number, orderCount: number): AiStationSummary {
    let score = 100;
    score -= Math.min(30, openOrders * 2);
    score -= Math.min(35, lowStockCount * 8);
    if (orderCount === 0) score -= 20;

    const bounded = Math.max(10, Math.min(100, score));
    const status = bounded >= 75 ? 'good' : bounded >= 45 ? 'attention' : 'critical';
    const message =
      status === 'good'
        ? 'Operasyon dengeli, servis ve stok iyi gidiyor.'
        : status === 'attention'
          ? 'Birkaç kritik nokta var, ops panelde aksiyon al.'
          : 'Acil aksiyon gerekiyor: stok ve siparis kuyruğu baskıda.';

    return { score: bounded, status, message };
  }
}
