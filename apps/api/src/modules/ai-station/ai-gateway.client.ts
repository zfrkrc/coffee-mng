import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_ENV } from '../../core/config/config.module';
import type { ApiEnv } from '@cafeos/config';

/**
 * InsightMap merkezi AI Gateway client.
 *
 * Cafe POS core'un hiçbir parçası buna BAĞIMLI değildir — bu yalnızca opsiyonel
 * bir AI yardımcı katmanıdır. Gateway erişilemezse çağıran taraf deterministik
 * sonuca düşer. AI asla sipariş/ödeme/stok/masa durumu değiştirmez.
 */
@Injectable()
export class AiGatewayClient {
  private readonly logger = new Logger(AiGatewayClient.name);

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  get enabled(): boolean {
    return Boolean(this.env.INSIGHTMAP_AI_SERVICE_KEY);
  }

  async managementSummary(payload: Record<string, unknown>, externalJobId = ''): Promise<string> {
    const body: Record<string, unknown> = { task: 'management_summary', payload };
    if (externalJobId) body.external_job_id = externalJobId;

    const resp = await fetch(`${this.env.INSIGHTMAP_AI_URL}/api/ai/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-InsightMap-Service-Key': this.env.INSIGHTMAP_AI_SERVICE_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`InsightMap gateway HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }

    const data = (await resp.json()) as { ok?: boolean; result?: { summary?: string } };
    if (!data?.ok) throw new Error('InsightMap gateway ok=false');
    return (data.result?.summary || '').trim();
  }
}
