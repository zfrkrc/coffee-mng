// @ts-nocheck — async migration
/**
 * AiStation management summary tests — central InsightMap gateway integration.
 *
 * Deterministik AI Station'a dokunulmaz; yalnızca opsiyonel AI özet katmanı test edilir.
 * Gerçek network çağrısı YOK — fetch mock'lanır.
 */
import { CustomerService } from '../customer/customer.service';
import { AiStationService } from './ai-station.service';
import { AiGatewayClient } from './ai-gateway.client';

describe('AiGatewayClient', () => {
  const env = { INSIGHTMAP_AI_URL: 'https://gateway.test', INSIGHTMAP_AI_SERVICE_KEY: 'sk-test' } as any;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns summary on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: { summary: 'özet' } }),
    }) as any;
    const client = new AiGatewayClient(env);
    const s = await client.managementSummary({ order_count: 5 });
    expect(s).toBe('özet');
  });

  it('throws on 5xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('bad gateway'),
    }) as any;
    const client = new AiGatewayClient(env);
    await expect(client.managementSummary({})).rejects.toThrow(/502/);
  });

  it('throws on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect refused')) as any;
    const client = new AiGatewayClient(env);
    await expect(client.managementSummary({})).rejects.toThrow('connect refused');
  });

  it('disabled when service key empty', () => {
    const client = new AiGatewayClient({ ...env, INSIGHTMAP_AI_SERVICE_KEY: '' });
    expect(client.enabled).toBe(false);
  });
});

describe('AiStationService.getManagementSummary', () => {
  const customer = new CustomerService();

  it('falls back to deterministic when gateway disabled', async () => {
    const gateway = { enabled: false, managementSummary: jest.fn() } as any;
    const svc = new AiStationService(customer, {} as any, gateway);
    const r = await svc.getManagementSummary('cafeos.waycoffee.com.tr');
    expect(r.source).toBe('deterministic');
    expect(typeof r.summary).toBe('string');
    expect(gateway.managementSummary).not.toHaveBeenCalled();
  });

  it('uses AI summary when gateway returns one', async () => {
    const gateway = { enabled: true, managementSummary: jest.fn().mockResolvedValue('Bugün 143 sipariş alındı.') } as any;
    const svc = new AiStationService(customer, {} as any, gateway);
    const r = await svc.getManagementSummary('cafeos.waycoffee.com.tr');
    expect(r.source).toBe('ai');
    expect(r.summary).toBe('Bugün 143 sipariş alındı.');
  });

  it('falls back to deterministic when gateway throws', async () => {
    const gateway = { enabled: true, managementSummary: jest.fn().mockRejectedValue(new Error('down')) } as any;
    const svc = new AiStationService(customer, {} as any, gateway);
    const r = await svc.getManagementSummary('cafeos.waycoffee.com.tr');
    expect(r.source).toBe('deterministic');
    expect(typeof r.summary).toBe('string');
  });
});

describe('AiStationService deterministic regression', () => {
  it('snapshot still computes deterministic summary/recommendations/forecasts', async () => {
    const gateway = { enabled: false, managementSummary: jest.fn() } as any;
    const aiUsage = { record: jest.fn().mockResolvedValue({}) } as any;
    const svc = new AiStationService(new CustomerService(), aiUsage, gateway);
    const snap = await svc.getSnapshot('cafeos.waycoffee.com.tr');
    expect(snap.summary).toHaveProperty('score');
    expect(snap.summary).toHaveProperty('status');
    expect(snap.recommendations).toBeInstanceOf(Array);
    expect(snap.forecasts).toBeInstanceOf(Array);
  });
});
