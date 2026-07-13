import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { AppText, Heading, Value, Caption, Label } from '@/components/Text';
import { Button, Card, Chip } from '@/components/Button';
import { StatCard } from '@/components/Card';
import { CandlestickChart, Sparkline } from '@/components/Charts';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatPercent, formatNumber, formatTimeAgo, getSignalColor, getConfidenceColor } from '@/utils/format';

export const DashboardScreen = () => {
  const { 
    botStatus, 
    setBotStatus, 
    performance, 
    setPerformance,
    trades,
    setTrades,
    candles,
    setCandles,
    strategy,
    setStrategy,
    aiInsights,
    setAiInsights,
    isLoading,
    setIsLoading,
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [status, perf, tradeData, chartData, stratData, insights] = await Promise.all([
        api.getStatus(),
        api.getPerformance(),
        api.getTrades(10),
        api.getCandles(),
        api.getStrategy(),
        api.getAIInsights(),
      ]);
      setBotStatus(status);
      setPerformance(perf);
      setTrades(tradeData);
      setCandles(chartData);
      setStrategy(stratData);
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setBotStatus, setPerformance, setTrades, setCandles, setStrategy, setAiInsights, setIsLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (isLoading && !botStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading dashboard...</AppText>
      </View>
    );
  }

  const balance = botStatus?.balance_usdt || 0;
  const position = botStatus?.position;
  const isRunning = botStatus?.running || false;
  const pnl = performance?.total_pnl || 0;
  const winRate = performance?.win_rate || 0;
  const totalTrades = performance?.total_trades || 0;
  const wins = performance?.wins || 0;
  const losses = performance?.losses || 0;
  const currentPrice = botStatus?.indicators?.last_price || 0;
  const rsi = botStatus?.indicators?.rsi;
  const emaShort = botStatus?.indicators?.ema_short;
  const emaLong = botStatus?.indicators?.ema_long;

  const positionPnL = position ? ((currentPrice - position.entry_price) / position.entry_price) * 100 * (position.side === 'buy' ? 1 : -1) : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Heading level={2}>Dashboard</Heading>
          <Caption color={colors.textSecondary}>Paper trading mode • {botStatus?.symbol || 'BTC/USDT'}</Caption>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isRunning ? colors.success : colors.error }]} />
          <AppText variant="caption" weight="bold" color={colors.textPrimary}>
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </AppText>
        </View>
      </View>

      {/* Portfolio Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Balance"
          value={formatCurrency(balance)}
          trend={pnl >= 0 ? 'up' : 'down'}
          trendValue={formatPercent(pnl / balance * 100)}
          color={colors.primary}
        />
        <StatCard
          label="Total P&L"
          value={formatCurrency(pnl)}
          trend={pnl >= 0 ? 'up' : 'down'}
          trendValue={formatPercent(pnl)}
          color={pnl >= 0 ? colors.success : colors.error}
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(winRate * 100)}
          trend={winRate >= 0.5 ? 'up' : 'down'}
          trendValue={`${wins}W ${losses}L`}
          color={winRate >= 0.5 ? colors.success : colors.warning}
        />
        <StatCard
          label="Total Trades"
          value={totalTrades}
          color={colors.info}
        />
      </View>

      {/* Current Position */}
      <Card style={styles.positionCard}>
        <View style={styles.positionHeader}>
          <Heading level={3}>Current Position</Heading>
          <View style={styles.positionStatus}>
            <View style={[styles.statusPill, { backgroundColor: position ? (position.side === 'buy' ? colors.success : colors.error) : colors.textMuted }]}>
              <AppText variant="caption" weight="bold" color={colors.textInverse}>
                {position ? `${position.side.toUpperCase()} ${formatCurrency(position.entry_price)}` : 'NO POSITION'}
              </AppText>
            </View>
          </View>
        </View>

        {position ? (
          <View style={styles.positionDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detail}>
                <Label>Entry Price</Label>
                <Value>{formatCurrency(position.entry_price)}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Quantity</Label>
                <Value>{formatNumber(position.quantity, 6)}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Stop Loss</Label>
                <Value color={colors.error}>{formatCurrency(position.entry_price * (1 - (position.stop_loss_pct || 0.05)))}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Take Profit</Label>
                <Value color={colors.success}>{formatCurrency(position.entry_price * (1 + (position.take_profit_pct || 0.10)))}</Value>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detail}>
                <Label>Current P&L</Label>
                <Value color={positionPnL >= 0 ? colors.success : colors.error}>{formatPercent(positionPnL)}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Unrealized</Label>
                <Value color={positionPnL >= 0 ? colors.success : colors.error}>{formatCurrency(positionPnL / 100 * position.entry_price * position.quantity)}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Side</Label>
                <Value color={position.side === 'buy' ? colors.success : colors.error}>{position.side.toUpperCase()}</Value>
              </View>
              <View style={styles.detail}>
                <Label>Duration</Label>
                <Value>{formatTimeAgo(position.entry_time)}</Value>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noPosition}>
            <AppText variant="body" color={colors.textSecondary} style={styles.noPositionText}>
              {isRunning ? 'Bot is searching for entry signals...' : 'Start the bot to begin trading'}
            </AppText>
          </View>
        )}
      </Card>

      {/* Price Chart */}
      <Card style={styles.chartCard}>
        <Heading level={3} style={styles.chartTitle}>Price Chart (1H)</Heading>
        <View style={styles.chart}>
          {candles.length > 0 && <CandlestickChart data={candles.slice(-50)} entryPrice={position?.entry_price} height={200} />}
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <Button title={isRunning ? 'Stop Bot' : 'Start Bot'} onPress={isRunning ? () => api.stopBot('now') : () => api.startBot()} variant={isRunning ? 'danger' : 'success'} size="lg" fullWidth />
        <Button title="Optimize Strategy" onPress={() => api.optimize(500)} variant="primary" size="lg" fullWidth />
        <Button title="Train ML Model" onPress={() => api.trainModel()} variant="secondary" size="lg" fullWidth />
        <Button title="Switch Pair" onPress={() => {}} variant="outline" size="lg" fullWidth />
      </View>

      {/* Recent Trades */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heading level={3}>Recent Trades</Heading>
        </View>
        {trades.length === 0 ? (
          <Card style={styles.emptyState}>
            <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>No trades yet. Start the bot to begin trading.</AppText>
          </Card>
        ) : (
          <View style={styles.tradesList}>
            {trades.map((trade) => (
              <Card key={trade.id} style={styles.tradeCard}>
                <View style={styles.tradeHeader}>
                  <View style={styles.tradeSide}>
                    <View style={[styles.sideBadge, { backgroundColor: trade.side === 'buy' ? colors.success : colors.error }]}>
                      <AppText variant="caption" weight="bold" color={colors.textInverse}>{trade.side.toUpperCase()}</AppText>
                    </View>
                    <AppText variant="caption" color={colors.textSecondary}>{trade.symbol}</AppText>
                  </View>
                  <View style={styles.tradeStatus}>
                    <Chip 
                      label={trade.status === 'closed' ? (trade.pnl !== null && trade.pnl >= 0 ? 'WIN' : 'LOSS') : 'OPEN'} 
                      selected={trade.status === 'closed' && trade.pnl !== null && trade.pnl >= 0}
                      variant={trade.status === 'closed' ? (trade.pnl !== null && trade.pnl >= 0 ? 'success' : 'danger') : 'info'}
                    />
                  </View>
                </View>
                <View style={styles.tradeDetails}>
                  <View style={styles.tradeDetail}>
                    <Label>Entry</Label>
                    <Value>{formatCurrency(trade.entry_price)}</Label>
                  </View>
                  <View style={styles.tradeDetail}>
                    <Label>Exit</Label>
                    <Value>{trade.exit_price ? formatCurrency(trade.exit_price) : '—'}</Value>
                  </View>
                  <View style={styles.tradeDetail}>
                    <Label>P&L</Label>
                    <Value color={trade.pnl !== null && trade.pnl >= 0 ? colors.success : colors.error}>
                      {trade.pnl !== null ? formatCurrency(trade.pnl) : '—'}
                    </Value>
                  </View>
                  <View style={styles.tradeDetail}>
                    <Label>Time</Label>
                    <Value>{formatTimeAgo(trade.entry_time)}</Value>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* AI Insights Summary */}
      {aiInsights && (
        <Card style={styles.aiCard}>
          <Heading level={3} style={styles.aiTitle}>AI Insights</Heading>
          <View style={styles.aiMessages}>
            {aiInsights.messages.slice(0, 3).map((msg, i) => (
              <View key={i} style={[styles.aiMessage, { backgroundColor: getMessageColor(msg) }]}>
                <AppText variant="caption" style={styles.aiMessageText}>{msg}</AppText>
              </View>
            ))}
          </View>
          <View style={styles.aiFooter}>
            <AppText variant="caption" color={colors.textSecondary}>
              Recommended: <AppText weight="bold" color={colors.success}>{aiInsights.recommended_pair}</AppText>
            </AppText>
            {aiInsights.suggest_optimize && (
              <Button title="Auto-Optimize" onPress={() => api.optimize(500)} variant="primary" size="sm" />
            )}
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.bgCard, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.borderPrimary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  positionCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  positionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  positionStatus: { flexDirection: 'row', alignItems: 'center' },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  positionDetails: { gap: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  detail: { flex: 1, minWidth: 80 },
  noPosition: { padding: spacing.lg, alignItems: 'center' },
  noPositionText: { textAlign: 'center' },
  chartCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  chartTitle: { marginBottom: spacing.sm },
  chart: { height: 200 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  emptyState: { marginHorizontal: spacing.md, padding: spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
  tradesList: { marginHorizontal: spacing.md, gap: spacing.sm },
  tradeCard: { padding: spacing.md },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  tradeSide: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sideBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  tradeStatus: { alignItems: 'flex-end' },
  tradeDetails: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  tradeDetail: { minWidth: 70 },
  aiCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  aiTitle: { marginBottom: spacing.md },
  aiMessages: { gap: spacing.sm, marginBottom: spacing.md },
  aiMessage: { padding: spacing.md, borderRadius: borderRadius.md },
  aiMessageText: { lineHeight: 20 },
  aiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderPrimary },
});

function getMessageColor(msg: string) {
  if (msg.includes('⚠️') || msg.includes('loss')) return colors.warning + '20';
  if (msg.includes('📈') || msg.includes('💡') || msg.includes('✅')) return colors.success + '20';
  if (msg.includes('⏳') || msg.includes('🔍') || msg.includes('🔄')) return colors.info + '20';
  return colors.surface;
}