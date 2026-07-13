import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { AppText, Heading, Label, Value, Body, Caption, Overline } from '@/components/Text';
import { Button, Card, Chip } from '@/components/Button';
import { SimpleLineChart } from '@/components/Charts';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatPercent, formatNumber, formatTimeAgo } from '@/utils/format';

export const StrategyScreen = () => {
  const { 
    strategy, 
    setStrategy, 
    strategyHistory, 
    setStrategyHistory,
    performance,
    setPerformance,
    isOptimizing,
    setIsOptimizing,
    isLoading,
    setIsLoading,
  } = useAppStore();

  const [showActivateModal, setShowActivateModal] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [strat, hist, perf] = await Promise.all([
        api.getStrategy(),
        api.getStrategyHistory(),
        api.getPerformance(),
      ]);
      setStrategy(strat);
      setStrategyHistory(hist);
      setPerformance(perf);
    } catch (error) {
      console.error('Failed to fetch strategy data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setStrategy, setStrategyHistory, setPerformance, setIsLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading && !strategy) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading strategy...</AppText>
      </View>
    );
  }

  const activeStrategy = strategyHistory.find(s => s.is_active);
  const sharpe = strategy?.sharpe_ratio || activeStrategy?.sharpe_ratio || 0;
  const wins = strategy?.wins || activeStrategy?.wins || 0;
  const losses = strategy?.losses || activeStrategy?.losses || 0;
  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  const strategyColor = sharpe >= 1 ? colors.success : sharpe >= 0 ? colors.warning : colors.error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Strategy Card */}
      <Card style={styles.activeCard} gradient colors={[strategyColor + 'DD', strategyColor + '88']}>
        <View style={styles.activeHeader}>
          <View style={styles.activeBadge}>
            <AppText variant="overline" weight="bold" color={colors.textInverse}>ACTIVE</AppText>
          </View>
          <View style={styles.sharpeBadge}>
            <AppText variant="caption" color={colors.textInverse} weight="semibold">Sharpe: {sharpe !== null ? sharpe.toFixed(3) : '—'}</AppText>
          </View>
        </View>
        
        <View style={styles.performanceRow}>
          <View style={styles.perfItem}>
            <Label>Win Rate</Label>
            <Value color={winRate >= 50 ? colors.success : colors.error}>{winRate.toFixed(1)}%</Value>
          </View>
          <View style={styles.perfItem}>
            <Label>Total Trades</Label>
            <Value>{totalTrades}</Value>
          </View>
          <View style={styles.perfItem}>
            <Label>Wins / Losses</Label>
            <Value>{wins} / {losses}</Value>
          </View>
        </View>

        <Heading level={3} style={styles.paramsTitle}>Current Parameters</Heading>
        <View style={styles.paramsGrid}>
          {Object.entries(strategy?.params || activeStrategy?.params || {}).map(([key, value]) => (
            <View key={key} style={styles.paramItem}>
              <Label>{key.replace(/_/g, ' ').toUpperCase()}</Label>
              <Value>{typeof value === 'number' ? (value < 1 ? value.toFixed(3) : value.toFixed(0)) : value}</Value>
            </View>
          ))}
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Button title={isOptimizing ? 'Optimizing...' : 'Auto-Optimize'} onPress={() => api.optimize(500)} variant="primary" size="lg" fullWidth disabled={isOptimizing || isLoading} />
        <Button title="Train ML Model" onPress={() => api.trainModel()} variant="secondary" size="lg" fullWidth disabled={isLoading} />
      </View>

      {/* Strategy History */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>Strategy History</Heading>
        <View style={styles.historyList}>
          {strategyHistory.slice(0, 10).map((item, index) => {
            const itemWinRate = item.total_trades > 0 ? (item.wins / item.total_trades) * 100 : 0;
            const isActive = item.is_active;
            return (
              <TouchableOpacity key={item.id} style={[styles.historyItem, isActive && styles.historyItemActive]} onPress={() => !isActive && setShowActivateModal(item)}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyBadge, isActive && styles.historyBadgeActive]}>
                    <AppText variant="overline" weight="bold" color={isActive ? colors.textInverse : colors.textSecondary}>
                      #{item.id}
                    </AppText>
                  </View>
                  <View>
                    <Heading level={4} style={styles.historyName}>Strategy #{item.id}</Heading>
                    <Caption color={colors.textSecondary}>{formatTimeAgo(item.created_at)}</Caption>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <View style={styles.historyMetric}>
                    <Value color={item.sharpe_ratio !== null && item.sharpe_ratio >= 1 ? colors.success : item.sharpe_ratio !== null && item.sharpe_ratio >= 0 ? colors.warning : colors.error}>
                      {item.sharpe_ratio !== null ? item.sharpe_ratio.toFixed(3) : '—'}
                    </Value>
                    <Caption>Sharpe</Caption>
                  </View>
                  <View style={styles.historyMetric}>
                    <Value color={itemWinRate >= 50 ? colors.success : colors.error}>{itemWinRate.toFixed(1)}%</Value>
                    <Caption>Win Rate</Caption>
                  </View>
                  <View style={styles.historyMetric}>
                    <Value>{item.total_trades}</Value>
                    <Caption>Trades</Caption>
                  </View>
                  {isActive && <AppText variant="caption" weight="bold" color={colors.success}>ACTIVE</AppText>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Activate Modal */}
      <Modal visible={!!showActivateModal} transparent animationType="fade" onRequestClose={() => setShowActivateModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Heading level={3} style={styles.modalTitle}>Activate Strategy</Heading>
            <Body color={colors.textSecondary} style={styles.modalText}>
              Activate Strategy #{showActivateModal?.id}? This will replace the current active strategy.
            </Body>
            <View style={styles.modalParams}>
              {Object.entries(showActivateModal?.params || {}).map(([key, value]) => (
                <View key={key} style={styles.modalParam}>
                  <Label>{key.replace(/_/g, ' ').toUpperCase()}</Label>
                  <Value>{typeof value === 'number' ? (value < 1 ? value.toFixed(3) : value.toFixed(0)) : value}</Value>
                </View>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowActivateModal(null)} variant="ghost" size="md" fullWidth />
              <Button title="Activate" onPress={() => { api.activateStrategy(showActivateModal!.id); setShowActivateModal(null); }} variant="primary" size="md" fullWidth />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  activeCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.lg },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  activeBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.primary },
  sharpeBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.2)' },
  performanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  perfItem: { alignItems: 'center', flex: 1 },
  paramsTitle: { marginBottom: spacing.md },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paramItem: { minWidth: 100, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.md },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  historyList: { gap: spacing.sm },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderPrimary },
  historyItemActive: { borderColor: colors.primary, borderWidth: 2 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyBadge: { width: 36, height: 36, borderRadius: borderRadius.full, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  historyBadgeActive: { backgroundColor: colors.primary },
  historyName: { marginBottom: spacing.xs },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyMetric: { alignItems: 'flex-end', minWidth: 60 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlayDark, justifyContent: 'center', paddingHorizontal: spacing.md },
  modalContent: { backgroundColor: colors.bgCard, borderRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { marginBottom: spacing.sm },
  modalText: { marginBottom: spacing.lg, lineHeight: 24 },
  modalParams: { marginBottom: spacing.lg, maxHeight: 300 },
  modalParam: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});