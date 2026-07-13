import axios, { AxiosInstance } from 'axios';
import type { 
  BotStatus, Trade, Performance, StrategyInfo, AIInsights, 
  DeepAnalysis, Candle, StrategyVotes, ModelStatus, ModelPredictLive,
  StrategyHistoryItem, ActivityLogItem, NewsItem, SymbolsResponse
} from '@/types';

const API_BASE = 'https://aitrade-production-ecba.up.railway.app/api';

class ApiService {
  private client: AxiosInstance;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // REST API
  async getStatus(): Promise<BotStatus> {
    const { data } = await this.client.get('/status');
    return data;
  }

  async startBot(): Promise<{ status: string }> {
    const { data } = await this.client.post('/start');
    return data;
  }

  async stopBot(mode: 'now' | 'after_trade' = 'now'): Promise<{ status: string }> {
    const { data } = await this.client.post(`/stop?mode=${mode}`);
    return data;
  }

  async getTrades(limit = 50): Promise<Trade[]> {
    const { data } = await this.client.get(`/trades?limit=${limit}`);
    return data;
  }

  async getStrategy(): Promise<StrategyInfo> {
    const { data } = await this.client.get('/strategy');
    return data;
  }

  async optimize(nTrials = 500): Promise<{ params: any; sharpe_ratio: number; kept_existing?: boolean; current_sharpe?: number }> {
    const { data } = await this.client.post('/optimize', { n_trials: nTrials });
    return data;
  }

  async getPerformance(): Promise<Performance> {
    const { data } = await this.client.get('/performance');
    return data;
  }

  async getCandles(): Promise<Candle[]> {
    const { data } = await this.client.get('/candles');
    return data;
  }

  async getSymbols(): Promise<string[]> {
    const { data } = await this.client.get('/symbols');
    return data;
  }

  async setSymbol(symbol: string): Promise<{ symbol: string }> {
    const { data } = await this.client.post('/symbol', { symbol });
    return data;
  }

  async getAIInsights(): Promise<AIInsights> {
    const { data } = await this.client.get('/ai-insights');
    return data;
  }

  async getDeepAnalysis(): Promise<DeepAnalysis> {
    const { data } = await this.client.get('/ai-deep-analysis');
    return data;
  }

  async getStrategyVotes(): Promise<StrategyVotes> {
    const { data } = await this.client.get('/strategy-votes');
    return data;
  }

  async getActivityLog(): Promise<ActivityLogItem[]> {
    const { data } = await this.client.get('/activity-log');
    return data;
  }

  async getNews(): Promise<NewsItem[]> {
    const { data } = await this.client.get('/news');
    return data.news;
  }

  async getStrategyHistory(): Promise<StrategyHistoryItem[]> {
    const { data } = await this.client.get('/strategy-history');
    return data;
  }

  async activateStrategy(id: number): Promise<{ status: string; params: any; sharpe_ratio: number | null }> {
    const { data } = await this.client.post('/strategy/activate', { strategy_id: id });
    return data;
  }

  async trainModel(): Promise<{ status: string; trades_used?: number; accuracy?: number; improvement?: number; message?: string }> {
    const { data } = await this.client.post('/model/train');
    return data;
  }

  async getModelStatus(): Promise<ModelStatus> {
    const { data } = await this.client.get('/model/status');
    return data;
  }

  async getModelPredictLive(): Promise<ModelPredictLive> {
    const { data } = await this.client.get('/model/predict-live');
    return data;
  }

  // WebSocket
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket('wss://aitrade-production-ecba.up.railway.app/ws');

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('status', data);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed, attempting reconnect...');
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connectWebSocket().catch(() => {});
    }, 2000 * this.reconnectAttempts);
  }

  disconnectWebSocket() {
    this.ws?.close();
    this.ws = null;
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.wsListeners.has(event)) {
      this.wsListeners.set(event, new Set());
    }
    this.wsListeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.wsListeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any) {
    this.wsListeners.get(event)?.forEach(callback => callback(data));
  }
}

export const api = new ApiService();