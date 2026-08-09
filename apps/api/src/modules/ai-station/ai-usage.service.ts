import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../../core/redis/redis.module';

export interface AiUsageRecordInput {
  domainKey: string;
  promptText: string;
  completionText: string;
}

export interface AiUsageRecord {
  domainKey: string;
  ts: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costTl: number;
}

export interface AiUsageAggregate {
  windowHours: number;
  totalInvocations: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostTl: number;
  byDomain: Array<{
    domainKey: string;
    invocations: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCostTl: number;
  }>;
}

const EVENTS_KEY = 'cafeos:ai-usage:events';
const COST_PROMPT_PER_1K_TL = 0.0012;
const COST_COMPLETION_PER_1K_TL = 0.0018;

@Injectable()
export class AiUsageService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async record(input: AiUsageRecordInput): Promise<AiUsageRecord> {
    const promptTokens = this.estimateTokens(input.promptText);
    const completionTokens = this.estimateTokens(input.completionText);
    const totalTokens = promptTokens + completionTokens;
    const costTl = this.calculateCostTl(promptTokens, completionTokens);
    const ts = Date.now();
    const record: AiUsageRecord = {
      domainKey: input.domainKey,
      ts,
      promptTokens,
      completionTokens,
      totalTokens,
      costTl,
    };

    await this.redis.zadd(EVENTS_KEY, ts, JSON.stringify(record));
    await this.redis.zremrangebyscore(EVENTS_KEY, '-inf', ts - 1000 * 60 * 60 * 24 * 30);

    return record;
  }

  async getAggregate(hours: number): Promise<AiUsageAggregate> {
    const safeHours = Math.max(1, Math.min(24 * 30, Math.floor(hours) || 24));
    const now = Date.now();
    const minTs = now - safeHours * 60 * 60 * 1000;
    const raw = await this.redis.zrangebyscore(EVENTS_KEY, minTs, now);

    const byDomainMap = new Map<
      string,
      {
        invocations: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCostTl: number;
      }
    >();

    let totalInvocations = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalCostTl = 0;

    for (const line of raw) {
      let record: AiUsageRecord | null = null;
      try {
        record = JSON.parse(line) as AiUsageRecord;
      } catch {
        record = null;
      }
      if (!record) continue;

      totalInvocations += 1;
      totalPromptTokens += record.promptTokens;
      totalCompletionTokens += record.completionTokens;
      totalTokens += record.totalTokens;
      totalCostTl += record.costTl;

      const current = byDomainMap.get(record.domainKey) ?? {
        invocations: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCostTl: 0,
      };
      current.invocations += 1;
      current.promptTokens += record.promptTokens;
      current.completionTokens += record.completionTokens;
      current.totalTokens += record.totalTokens;
      current.totalCostTl += record.costTl;
      byDomainMap.set(record.domainKey, current);
    }

    const byDomain = Array.from(byDomainMap.entries())
      .map(([domainKey, v]) => ({ domainKey, ...v }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    return {
      windowHours: safeHours,
      totalInvocations,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCostTl: Number(totalCostTl.toFixed(6)),
      byDomain: byDomain.map((row) => ({ ...row, totalCostTl: Number(row.totalCostTl.toFixed(6)) })),
    };
  }

  private estimateTokens(text: string): number {
    const normalized = text.trim();
    if (!normalized) return 0;
    return Math.max(1, Math.ceil(normalized.length / 4));
  }

  private calculateCostTl(promptTokens: number, completionTokens: number): number {
    const promptCost = (promptTokens / 1000) * COST_PROMPT_PER_1K_TL;
    const completionCost = (completionTokens / 1000) * COST_COMPLETION_PER_1K_TL;
    return promptCost + completionCost;
  }
}
