import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { AppText, Body, Caption, Overline, Title, Heading, Label, Value } from '@/components/Text';
import { Card, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { CandlestickChart, SimpleLineChart, Sparkline } from '@/components/Charts';
import { formatCurrency, formatPercent, formatTimeAgo, formatNumber, getSignalColor, getConfidenceColor } from '@/utils/format';
import { colors, spacing, borderRadius, typography } from '@/theme';

export const TradingScreen = () => {
  const { 
    botStatus, 
    setBotStatus, 
    candles, 
    setCandles,
    strategyVotes,
    setStrategyVotes,
    currentSymbol,
    setCurrentSymbol,
    isLoading,
    setIsLoading,
  } = useAppStore();

  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h');
  const [showIndicators, setShowIndicators] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [status, chartData, votes] = await Promise.all([
        api.getStatus(),
        api.getCandles(),
        api.getStrategyVotes(),
      ]);
      setBotStatus(status);
      setCandles(chartData);
      setStrategyVotes(votes);
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setBotStatus, setCandles, setStrategyVotes, setIsLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading && !botStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading trading data...</AppText>
      </View>
    );
  }

  const price = botStatus?.indicators?.last_price || 0;
  const position = botStatus?.position;
  const isRunning = botStatus?.running || false;
  const rsi = botStatus?.indicators?.rsi;
  const emaShort = botStatus?.indicators?.ema_short;
  const emaLong = botStatus?.indicators?.ema_long;

  const votes = strategyVotes?.votes || [];
  const tracking = strategyVotes?.tracking || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Heading level={2} style={styles.headerTitle}>{currentSymbol}</Heading>
          <View style={styles.symbolSelector}>
            <AppText variant="caption" color={colors.textSecondary}>{timeframe}</AppText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: isRunning ? colors.success : colors.error }]}>
            <AppText variant="caption" weight="bold" color={colors.textInverse}>
              {isRunning ? 'LIVE' : 'PAUSED'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Price & Indicators */}
      <View style={styles.priceRow}>
        <View style={styles.priceCard}>
          <Caption color={colors.textSecondary}>Current Price</Caption>
          <Title weight="bold" style={styles.priceValue}>
            {formatCurrency(price)}
          </Title>
        </View>
        <View style={styles.indicatorCard}>
          <Caption color={colors.textSecondary}>RSI (14)</Caption>
          <Title weight="bold" color={rsi ? (rsi >= 70 ? colors.error : rsi <= 30 ? colors.success : colors.info) : colors.textMuted}>
            {rsi !== null ? rsi.toFixed(1) : '—'}
          </Title>
        </View>
        <View style={styles.indicatorCard}>
          <Caption color={colors.textSecondary}>EMA Gap</Caption>
          <Title weight="bold" color={emaShort && emaLong ? (emaShort > emaLong ? colors.success : colors.error) : colors.textMuted}>
            {emaShort && emaLong ? `${((emaShort - emaLong) / emaLong * 100).toFixed(2)}%` : '—'}
          </Title>
        </View>
      </View>

      {/* Chart */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Heading level={3}>Price Chart</Heading>
          <View style={styles.chartControls}>
            <TouchableOpacity onPress={() => setTimeframe('1h')} style={[styles.timeframeBtn, timeframe === '1h' && styles.timeframeBtnActive]}>
              <AppText variant="caption" weight="semibold" color={timeframe === '1h' ? colors.textInverse : colors.textSecondary}>1H</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTimeframe('4h')} style={[styles.timeframeBtn, timeframe === '4h' && styles.timeframeBtnActive]}>
              <AppText variant="caption" weight="semibold" color={timeframe === '4h' ? colors.textInverse : colors.textSecondary}>4H</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTimeframe('1d')} style={[styles.timeframeBtn, timeframe === '1d' && styles.timeframeBtnActive]}>
              <AppText variant="caption" weight="semibold" color={timeframe === '1d' ? colors.textInverse : colors.textSecondary}>1D</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowIndicators(!showIndicators)} style={[styles.timeframeBtn, showIndicators && styles.timeframeBtnActive]}>
              <AppText variant="caption" weight="semibold" color={showIndicators ? colors.textInverse : colors.textSecondary}>📈</AppText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.chart}>
          <CandlestickChart 
            data={candles.slice(-80)} 
            entryPrice={position?.entry_price}
            stopLoss={position?.stop_loss_pct ? position.entry_price * (1 - position.stop_loss_pct) : undefined}
            takeProfit={position?.take_profit_pct ? position.entry_price * (1 + position.take_profit_pct) : undefined}
            height={280}
          />
        </View>
      </Card>

      {/* Position Controls */}
      <Card style={styles.positionCard}>
        <Heading level={3} style={styles.sectionTitle}>Position Controls</Heading>
        
        {position ? (
          <View style={styles.activePosition}>
            <View style={styles.positionInfo}>
              <View>
                <Caption color={colors.textSecondary}>Side</Caption>
                <Body weight="bold" color={position.side === 'buy' ? colors.success : colors.error}>
                  {position.side.toUpperCase()}
                </Body>
              </View>
              <View>
                <Caption color={colors.textSecondary}>Entry</Caption>
                <Body weight="bold">{formatCurrency(position.entry_price)}</Body>
              </View>
              <View>
                <Caption color={colors.textSecondary}>Size</Caption>
                <Body weight="bold">{formatNumber(position.quantity, 6)}</Body>
              </View>
            </View>
            <View style={styles.positionActions}>
              <Button
                title="Close Position"
                onPress={() => {}}
                variant="danger"
                size="md"
                fullWidth
              />
            </View>
          </View>
        ) : (
          <View style={styles.noPosition}>
            <Body color={colors.textSecondary} style={styles.noPositionText}>
              No open position. Bot is {isRunning ? 'searching for entry' : 'stopped'}.
            </Body>
            {isRunning && (
              <View style={styles.autoTradeInfo}>
                <Caption color={colors.textMuted}>
                  Auto-trading enabled. Bot will enter when ensemble score > 0.25
                </Caption>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Ensemble Votes */}
      <Card style={styles.votesCard}>
        <Heading level={3} style={styles.sectionTitle}>Ensemble Signals</Heading>
        <View style={styles.votesList}>
          {votes.map((vote) => {
            const track = tracking[vote.name] || { wins: 0, losses: 0, trades: 0 };
            const winRate = track.trades > 0 ? track.wins / track.trades : 0;
            return (
              <View key={vote.name} style={styles.voteItem}>
                <View style={styles.voteLeft}>
                  <View style={[styles.voteColor, { backgroundColor: getSignalColor(vote.signal) }]} />
                  <View>
                    <Body weight="semibold">{vote.name}</Body>
                    <Caption color={colors.textSecondary}>
                      Confidence: {(vote.confidence * 100).toFixed(0)}% • Weight: {vote.weight.toFixed(1)}
                    </Caption>
                  </View>
                </View>
                <View style={styles.voteRight}>
                  <Caption weight="bold" color={vote.signal > 0 ? colors.success : vote.signal < 0 ? colors.error : colors.textMuted}>
                    {vote.signal > 0 ? 'BUY' : vote.signal < 0 ? 'SELL' : 'HOLD'}
                  </Caption>
                  <Caption color={colors.textSecondary}>
                    WR: {(winRate * 100).toFixed(0)}% ({track.wins}/{track.trades})
                  </Caption>
                </View>
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <Button title="Start Bot" onPress={() => api.startBot()} variant={isRunning ? 'secondary' : 'success'} size="lg" fullWidth disabled={isLoading} />
        <Button title="Stop Bot" onPress={() => api.stopBot('now')} variant="danger" size="lg" fullWidth disabled={isLoading || !isRunning} />
        <Button title="Optimize" onPress={() => api.optimize(500)} variant="primary" size="lg" fullWidth disabled={isLoading} />
        <Button title="Train Model" onPress={() => api.trainModel()} variant="secondary" size="lg" fullWidth disabled={isLoading} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { fontSize: typography.sizes.xxl },
  symbolSelector: { backgroundColor: colors.bgInput, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  priceCard: { flex: 1, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderPrimary },
  indicatorCard: { flex: 1, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center' },
  chartCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chartControls: { flexDirection: 'row', gap: spacing.xs },
  timeframeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.bgInput },
  timeframeBtnActive: { backgroundColor: colors.primary },
  chart: { marginTop: spacing.sm },
  positionCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.md },
  activePosition: { gap: spacing.md },
  positionInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  positionActions: { marginTop: spacing.sm },
  noPosition: { padding: spacing.lg, alignItems: 'center' },
  noPositionText: { textAlign: 'center' },
  autoTradeInfo: { marginTop: spacing.md, alignItems: 'center' },
  votesCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  votesList: { gap: spacing.md },
  voteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  voteLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  voteColor: { width: 12, height: 12, borderRadius: borderRadius.full },
  voteRight: { alignItems: 'flex-end', gap: spacing.xs },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.md, gap: spacing.sm },
});

function getSignalColor(signal: number) {
  if (signal > 0) return colors.success;
  if (signal < 0) return colors.error;
  return colors.textMuted;
}