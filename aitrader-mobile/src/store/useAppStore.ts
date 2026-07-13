import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BotStatus, Trade, Performance, StrategyInfo, AIInsights, Candle, StrategyVotes, ModelStatus, ModelPredictLive, StrategyHistoryItem, ActivityLogItem, NewsItem, DeepAnalysis, MLStatus, MLPredictLive, SymbolsResponse } from '@/types';

interface AppState {
  // Status
  status: BotStatus | null;
  setStatus: (status: BotStatus) => void;
  
  // Trades
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  updateTrade: (id: number, updates: Partial<Trade>) => void;
  
  // Performance
  performance: Performance | null;
  setPerformance: (perf: Performance) => void;
  
  // Strategy
  strategy: StrategyInfo | null;
  setStrategy: (strategy: StrategyInfo) => void;
  
  // AI Insights
  aiInsights: AIInsights | null;
  setAiInsights: (insights: AIInsights) => void;
  
  // Deep Analysis
  deepAnalysis: DeepAnalysis | null;
  setDeepAnalysis: (analysis: DeepAnalysis) => void;
  
  // Candles
  candles: Candle[];
  setCandles: (candles: Candle[]) => void;
  
  // Strategy Votes
  strategyVotes: StrategyVotes | null;
  setStrategyVotes: (votes: StrategyVotes) => void;
  
  // ML Model
  mlModel: MLStatus | null;
  setMlModel: (model: MLStatus) => void;
  
  mlPrediction: MLPredictLive | null;
  setMlPrediction: (pred: MLPredictLive) => void;
  
  // Strategy History
  strategyHistory: StrategyHistoryItem[];
  setStrategyHistory: (history: StrategyHistoryItem[]) => void;
  
  // Activity Log
  activityLog: ActivityLogItem[];
  setActivityLog: (log: ActivityLogItem[]) => void;
  
  // News
  news: NewsItem[];
  setNews: (news: NewsItem[]) => void;
  
  // Symbols
  symbols: string[];
  setSymbols: (symbols: string[]) => void;
  
  // UI State
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  isOptimizing: boolean;
  setIsOptimizing: (optimizing: boolean) => void;
  
  isTraining: boolean;
  setIsTraining: (training: boolean) => void;
  
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Notifications
  notifications: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>;
  addNotification: (notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      status: null,
      setStatus: (status) => set({ status }),
      
      trades: [],
      setTrades: (trades) => set({ trades }),
      addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
      updateTrade: (id, updates) => set((state) => ({
        trades: state.trades.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      performance: null,
      setPerformance: (performance) => set({ performance }),
      
      strategy: null,
      setStrategy: (strategy) => set({ strategy }),
      
      aiInsights: null,
      setAiInsights: (aiInsights) => set({ aiInsights }),
      
      deepAnalysis: null,
      setDeepAnalysis: (deepAnalysis) => set({ deepAnalysis }),
      
      candles: [],
      setCandles: (candles) => set({ candles }),
      
      strategyVotes: null,
      setStrategyVotes: (strategyVotes) => set({ strategyVotes }),
      
      mlModel: null,
      setMlModel: (mlModel) => set({ mlModel }),
      
      mlPrediction: null,
      setMlPrediction: (mlPrediction) => set({ mlPrediction }),
      
      strategyHistory: [],
      setStrategyHistory: (strategyHistory) => set({ strategyHistory }),
      
      activityLog: [],
      setActivityLog: (activityLog) => set({ activityLog }),
      
      news: [],
      setNews: (news) => set({ news }),
      
      symbols: [],
      setSymbols: (symbols) => set({ symbols }),
      
      currentSymbol: 'BTC/USDT',
      setCurrentSymbol: (currentSymbol) => set({ currentSymbol }),
      
      isLoading: true,
      setIsLoading: (isLoading) => set({ isLoading }),
      
      isOptimizing: false,
      setIsOptimizing: (isOptimizing) => set({ isOptimizing }),
      
      isTraining: false,
      setIsTraining: (isTraining) => set({ isTraining }),
      
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, { ...notification, id: Date.now().toString() }]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
    }),
    {
      name: 'aitrader-storage',
      partialize: (state) => ({
        currentSymbol: state.currentSymbol,
      }),
    }
  )
);