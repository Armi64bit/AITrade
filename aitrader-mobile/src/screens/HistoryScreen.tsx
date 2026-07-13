import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { AppText, Heading, Label, Value, Caption, Body, Overline } from '@/components/Text';
import { Button, Card, Chip } from '@/components/Button';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatPercent, formatNumber, formatTimeAgo, getSignalColor } from '@/utils/format';

export const HistoryScreen = () => {
  const { trades, setTrades, performance, setPerformance, strategyHistory, setStrategyHistory, isLoading, setIsLoading } = useAppStore();
  const [tab, setTab] = useState<'trades' | 'daily' | 'strategies'>('trades');
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [tradeData, perf, hist] = await Promise.all([
        api.getTrades(200),
        api.getPerformance(),
        api.getStrategyHistory(),
      ]);
      setTrades(tradeData);
      setPerformance(perf);
      setStrategyHistory(hist);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setTrades, setPerformance, setStrategyHistory, setIsLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading && !trades) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading history...</AppText>
      </View>
    );
  }

  const filteredTrades = trades.filter(t => {
    if (filter === 'win') return t.pnl !== null && t.pnl >= 0;
    if (filter === 'loss') return t.pnl !== null && t.pnl < 0;
    return true;
  });

  const tradesByDay = filteredTrades.reduce((acc, trade) => {
    if (trade.status !== 'closed' || trade.pnl === null) return acc;
    const date = new Date(trade.entry_time).toDateString();
    if (!acc[date]) acc[date] = { trades: [], pnl: 0, wins: 0, losses: 0 };
    acc[date].trades.push(trade);
    acc[date].pnl += trade.pnl;
    if (trade.pnl >= 0) acc[date].wins++;
    else acc[date].losses++;
    return acc;
  }, {} as Record<string, { trades: any[]; pnl: number; wins: number; losses: number }>);

  const sortedDays = Object.entries(tradesByDay).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Heading level={2}>History</Heading>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        {(['trades', 'daily', 'strategies'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <AppText variant="caption" weight="semibold" color={tab === t ? colors.textInverse : colors.textSecondary}>
              {t === 'trades' ? 'All Trades' : t === 'daily' ? 'Daily P&L' : 'Strategies'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'trades' && (
        <>
          {/* Filter */}
          <View style={styles.filterRow}>
            {(['all', 'win', 'loss'] as const).map((f) => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
                <AppText variant="caption" weight="semibold" color={filter === f ? colors.textInverse : colors.textSecondary}>
                  {f === 'all' ? `All (${trades.length})` : f === 'win' ? `Wins (${trades.filter(t => t.pnl !== null && t.pnl >= 0).length})` : `Losses (${trades.filter(t => t.pnl !== null && t.pnl < 0).length})`}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trades List */}
          <View style={styles.tradesList}>
            {filteredTrades.length === 0 ? (
              <Card style={styles.emptyState}>
                <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>No trades match filter</AppText>
              </Card>
            ) : (
              filteredTrades.map((trade) => (
                <Card key={trade.id} style={styles.tradeCard}>
                  <View style={styles.tradeHeader}>
                    <View style={styles.tradeSide}>
                      <View style={[styles.sideBadge, { backgroundColor: trade.side === 'buy' ? colors.success : colors.error }]}>
                        <AppText variant="caption" weight="bold" color={colors.textInverse}>{trade.side.toUpperCase()}</AppText>
                      </View>
                      <View style={styles.tradeInfo}>
                        <AppText variant="body" weight="bold">{trade.symbol}</AppText>
                        <Caption color={colors.textSecondary}>{formatTimeAgo(trade.entry_time)} • {formatCurrency(trade.entry_price)}</Caption>
                      </View>
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
                    <View style={styles.detail}>
                      <Label>Entry</Label>
                      <Value>{formatCurrency(trade.entry_price)}</Value>
                    </View>
                    <View style={styles.detail}>
                      <Label>Exit</Label>
                      <Value>{trade.exit_price ? formatCurrency(trade.exit_price) : '—'}</Value>
                    </View>
                    <View style={styles.detail}>
                      <Label>P&L</Label>
                      <Value color={trade.pnl !== null && trade.pnl >= 0 ? colors.success : colors.error}>
                        {trade.pnl !== null ? formatCurrency(trade.pnl) : '—'}
                      </Value>
                    </View>
                    <View style={styles.detail}>
                      <Label>P&L %</Label>
                      <Value color={trade.pnl_pct !== null && trade.pnl_pct >= 0 ? colors.success : colors.error}>
                        {trade.pnl_pct !== null ? formatPercent(trade.pnl_pct) : '—'}
                      </Value>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        </>
      )}

      {tab === 'daily' && (
        <View style={styles.dailyList}>
          {sortedDays.length === 0 ? (
            <Card style={styles.emptyState}>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>No daily data yet</AppText>
            </Card>
          ) : (
            sortedDays.map(([date, data]) => (
              <Card key={date} style={styles.dailyCard}>
                <View style={styles.dailyHeader}>
                  <View style={styles.dailyDate}>
                    <Heading level={4}>{date}</Heading>
                    <Caption>{data.trades.length} trades • {data.wins}W {data.losses}L</Caption>
                  </View>
                  <View style={styles.dailyPnL}>
                    <Value color={data.pnl >= 0 ? colors.success : colors.error}>{formatCurrency(data.pnl)}</Value>
                    <Caption color={colors.textSecondary}>{formatPercent(data.pnl / performance?.current_balance * 100)}</Caption>
                  </View>
                </View>
                <View style={styles.dailyTrades}>
                  {data.trades.slice(0, 3).map((trade) => (
                    <View key={trade.id} style={styles.miniTrade}>
                      <View style={[styles.miniSide, { backgroundColor: trade.side === 'buy' ? colors.success : colors.error }]}>
                        <AppText variant="overline" weight="bold" color={colors.textInverse}>{trade.side.toUpperCase()}</AppText>
                      </View>
                      <View style={styles.miniInfo}>
                        <Body weight="semibold">{trade.symbol}</Body>
                        <Caption>{formatCurrency(trade.entry_price)}</Caption>
                      </View>
                      <View style={styles.miniPnL}>
                        <Value color={trade.pnl !== null && trade.pnl >= 0 ? colors.success : colors.error}>
                          {trade.pnl !== null ? formatCurrency(trade.pnl) : '—'}
                        </Value>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {tab === 'strategies' && (
        <View style={styles.strategyHistory}>
          {strategyHistory.length === 0 ? (
            <Card style={styles.emptyState}>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>No strategy history yet</AppText>
            </Card>
          ) : (
            strategyHistory.map((item) => {
              const itemWinRate = item.total_trades > 0 ? (item.wins / item.total_trades) * 100 : 0;
              return (
                <Card key={item.id} style={[styles.strategyCard, item.is_active && styles.strategyCardActive]}>
                  <View style={styles.strategyHeader}>
                    <View style={styles.strategyId}>
                      <View style={[styles.strategyBadge, item.is_active && styles.strategyBadgeActive]}>
                        <AppText variant="overline" weight="bold" color={item.is_active ? colors.textInverse : colors.textSecondary}>
                          #{item.id}
                        </AppText>
                      </View>
                      <View>
                        <Heading level={4} style={styles.strategyName}>Strategy #{item.id}</Heading>
                        <Caption color={colors.textSecondary}>{formatTimeAgo(item.created_at)}</Caption>
                      </View>
                    </View>
                    {item.is_active && (
                      <View style={styles.activeBadge}>
                        <AppText variant="caption" weight="bold" color={colors.success}>ACTIVE</AppText>
                      </View>
                    )}
                  </View>
                  <View style={styles.strategyMetrics}>
                    <View style={styles.metric}>
                      <Value color={item.sharpe_ratio !== null && item.sharpe_ratio >= 1 ? colors.success : item.sharpe_ratio !== null && item.sharpe_ratio >= 0 ? colors.warning : colors.error}>
                        {item.sharpe_ratio !== null ? item.sharpe_ratio.toFixed(3) : '—'}
                      </Value>
                      <Caption>Sharpe</Caption>
                    </View>
                    <View style={styles.metric}>
                      <Value color={itemWinRate >= 50 ? colors.success : colors.error}>{itemWinRate.toFixed(1)}%</Value>
                      <Caption>Win Rate</Caption>
                    </View>
                    <View style={styles.metric}>
                      <Value>{item.total_trades}</Value>
                      <Caption>Trades</Caption>
                    </View>
                    <View style={styles.metric}>
                      <Value color={colors.success}>{item.wins}</Value>
                      <Caption>Wins</Caption>
                    </View>
                    <View style={styles.metric}>
                      <Value color={colors.error}>{item.losses}</Value>
                      <Caption>Losses</Caption>
                    </View>
                  </View>
                  <View style={styles.strategyParams}>
                    {Object.entries(item.params).slice(0, 8).map(([key, value]) => (
                      <View key={key} style={styles.paramChip}>
                        <Caption color={colors.textSecondary}>{key.replace(/_/g, ' ')}</Caption>
                        <Value>{typeof value === 'number' ? (value < 1 ? value.toFixed(3) : value.toFixed(0)) : value}</Value>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  tabSelector: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.xs },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.bgCard },
  filterBtnActive: { backgroundColor: colors.primary },
  tradesList: { paddingHorizontal: spacing.md, gap: spacing.sm },
  tradeCard: { padding: spacing.md },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  tradeSide: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sideBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  tradeInfo: { marginLeft: spacing.sm },
  tradeStatus: { alignItems: 'flex-end' },
  tradeDetails: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderPrimary },
  detail: { minWidth: 70 },
  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
  dailyList: { paddingHorizontal: spacing.md, gap: spacing.sm },
  dailyCard: { padding: spacing.md },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  dailyDate: { flex: 1 },
  dailyPnL: { alignItems: 'flex-end' },
  dailyTrades: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  miniTrade: { flex: 1, minWidth: 100, padding: spacing.sm, backgroundColor: colors.bgInput, borderRadius: borderRadius.md },
  miniSide: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  miniInfo: { marginTop: spacing.sm },
  miniPnL: { alignItems: 'flex-end', marginTop: spacing.sm },
  strategyHistory: { paddingHorizontal: spacing.md, gap: spacing.sm },
  strategyCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.borderPrimary },
  strategyCardActive: { borderColor: colors.primary, borderWidth: 2 },
  strategyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  strategyId: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strategyBadge: { width: 32, height: 32, borderRadius: borderRadius.full, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  strategyBadgeActive: { backgroundColor: colors.primary },
  strategyName: { marginBottom: spacing.xs },
  activeBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.success + '20', borderRadius: borderRadius.full },
  strategyMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  metric: { flex: 1, minWidth: 60, alignItems: 'center' },
  strategyParams: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paramChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.bgInput, borderRadius: borderRadius.full },
});