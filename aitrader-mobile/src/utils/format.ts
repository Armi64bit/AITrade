export const formatCurrency = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USDT',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number, decimals = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatPnL = (value: number): { text: string; color: string } => {
  const isPositive = value >= 0;
  return {
    text: formatPercent(value, 2),
    color: isPositive ? '#10b981' : '#ef4444',
  };
};

export const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const getTrendColor = (short: number | null, long: number | null): string => {
  if (!short || !long) return '#64748b';
  return short > long ? '#10b981' : '#ef4444';
};

export const getRSIColor = (rsi: number | null): string => {
  if (!rsi) return '#64748b';
  if (rsi >= 70) return '#ef4444';
  if (rsi <= 30) return '#10b981';
  if (rsi > 50) return '#3b82f6';
  return '#f59e0b';
};

export const getSignalColor = (signal: number): string => {
  if (signal > 0) return '#10b981';
  if (signal < 0) return '#ef4444';
  return '#64748b';
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.7) return '#10b981';
  if (confidence >= 0.4) return '#f59e0b';
  return '#ef4444';
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};