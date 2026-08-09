export interface AiStationSummary {
  score: number;
  status: 'good' | 'attention' | 'critical';
  message: string;
}

export interface AiStationRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sales' | 'inventory' | 'operations';
}

export interface AiStationForecast {
  productId: string;
  productName: string;
  forecastQty: number;
  confidence: number;
}

export interface AiStationSnapshot {
  generatedAt: string;
  summary: AiStationSummary;
  recommendations: AiStationRecommendation[];
  forecasts: AiStationForecast[];
}

export interface AiUsageSummary {
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  estimatedTotalTokens: number;
  estimatedCostTl: number;
}
