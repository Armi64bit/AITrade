import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText, Heading, Value, Caption, Label, Body } from '@/components/Text';
import { Button, Card, Chip } from '@/components/Button';
import { StatCard } from '@/components/Card';
import { SimpleLineChart, Sparkline } from '@/components/Charts';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatPercent, formatNumber, formatTimeAgo, getSignalColor, getConfidenceColor } from '@/utils/format';

export const AIInsightsScreen = () => {
  const { aiInsights, setAiInsights, deepAnalysis, setDeepAnalysis, isLoading, setIsLoading } = useAppStore();
  const [selectedTab, setSelectedTab] = useState<'insights' | 'signal' | 'deep'>('insights');
  const [signal, setSignal] = useState<any>(null);
  const [sigLoading, setSigLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      const insights = await api.getAIInsights();
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setAiInsights, setIsLoading]);

  const fetchSignal = useCallback(async () => {
    setSigLoading(true);
    try {
      const sig = await api.getDeepAnalysis();
      setSignal(sig);
      setDeepAnalysis(sig);
    } catch (error) {
      console.error('Failed to fetch AI signal:', error);
    } finally {
      setSigLoading(false);
    }
  }, [setDeepAnalysis]);

  useEffect(() => {
    fetchInsights();
    fetchSignal();
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, [fetchInsights, fetchSignal]);

  const { messages, recommended_pair, suggest_optimize, position_status, current_pnl, expected_next_trade, expected_profit_24h } = aiInsights || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Heading level={2}>AI Analysis</Heading>
          <Caption color={colors.textSecondary}>Powered by OpenRouter</Caption>
        </View>
        <Button title="Refresh" onPress={fetchSignal} variant="outline" size="sm" disabled={sigLoading} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['insights', 'signal', 'deep'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
          >
            <AppText variant="caption" weight="semibold" color={selectedTab === tab ? colors.textInverse : colors.textSecondary}>
              {tab === 'insights' ? 'Insights' : tab === 'signal' ? 'AI Signal' : 'Deep Analysis'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Insights Tab */}
      {selectedTab === 'insights' && aiInsights && (
        <>
          {/* Status Bar */}
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusItem, { backgroundColor: getPositionStatusColor(position_status) }]}>
                <AppText variant="caption" weight="bold" color={colors.textInverse}>{position_status}</AppText>
              </View>
              {current_pnl !== null && (
                <View style={styles.statusItem}>
                  <AppText variant="caption" color={colors.textSecondary}>Current P&L</AppText>
                  <AppText variant="title" weight="bold" color={current_pnl >= 0 ? colors.success : colors.error}>
                    {formatPercent(current_pnl)}
                  </AppText>
                </View>
              )}
              {expected_next_trade && (
                <View style={styles.statusItem}>
                  <AppText variant="caption" color={colors.textSecondary}>Next Trade</AppText>
                  <AppText variant="title" weight="bold" color={colors.info}>
                    ~{expected_next_trade}h
                  </AppText>
                </View>
              )}
              {expected_profit_24h && (
                <View style={styles.statusItem}>
                  <AppText variant="caption" color={colors.textSecondary}>24h Forecast</AppText>
                  <AppText variant="title" weight="bold" color={expected_profit_24h >= 0 ? colors.success : colors.error}>
                    {formatPercent(expected_profit_24h)}
                  </AppText>
                </View>
              )}
            </View>
          </Card>

          {/* AI Messages */}
          <View style={styles.section}>
            <Heading level={3} style={styles.sectionTitle}>AI Messages</Heading>
            <View style={styles.messagesList}>
              {messages.map((msg, i) => (
                <Card key={i} style={styles.messageCard}>
                  <AppText variant="caption" style={[styles.messageText, { backgroundColor: getMessageColor(msg) }]}>{msg}</AppText>
                </Card>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <AppText variant="caption" color={colors.textSecondary}>
              Recommended: <AppText weight="bold" color={colors.success}>{recommended_pair}</AppText>
            </AppText>
            {suggest_optimize && (
              <Button title="Auto-Optimize Now" onPress={() => api.optimize(500)} variant="primary" size="md" fullWidth />
            )}
          </View>
        </>
      )}

      {/* Signal Tab */}
      {selectedTab === 'signal' && (
        <>
          {sigLoading && !signal && (
            <Card style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Analyzing market...</AppText>
            </Card>
          )}
          
          {signal && (
            <Card style={styles.signalCard}>
              <View style={styles.signalHeader}>
                <Heading level={3}>AI Trading Signal</Heading>
                <View style={[styles.signalBadge, { backgroundColor: getSignalBgColor(signal.signal) }]}>
                  <AppText variant="caption" weight="bold" color={colors.textInverse}>{signal.signal}</AppText>
                </View>
              </View>

              <View style={styles.confidenceBar}>
                <AppText variant="caption" color={colors.textSecondary}>Confidence</AppText>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${signal.confidence}%`, backgroundColor: getConfidenceColor(signal.confidence) }]} />
                </View>
                <AppText variant="caption" weight="bold" color={getConfidenceColor(signal.confidence)}>{signal.confidence}%</AppText>
              </View>

              <View style={styles.signalGrid}>
                <View style={styles.signalItem}>
                  <Label>Entry</Label>
                  <Value>{signal.entry}</Value>
                </View>
                <View style={styles.signalItem}>
                  <Label>Stop Loss</Label>
                  <Value color={colors.error}>{signal.stop_loss}</Value>
                </View>
                <View style={styles.signalItem}>
                  <Label>Take Profit</Label>
                  <Value color={colors.success}>{signal.take_profit}</Value>
                </View>
              </View>

              {signal.reasoning && (
                <View style={styles.reasoning}>
                  <Label>Reasoning</Label>
                  <Body color={colors.textSecondary}>{signal.reasoning}</Body>
                </View>
              )}
            </Card>
          )}

          {!signal && !sigLoading && (
            <Card style={styles.emptySignal}>
              <AppText variant="body" color={colors.textSecondary} align="center">Click refresh to get a signal</AppText>
            </Card>
          )}
        </>
      )}

      {/* Deep Analysis Tab */}
      {selectedTab === 'deep' && deepAnalysis && (
        <Card style={styles.deepCard}>
          <Heading level={3}>Deep Market Analysis</Heading>
          <View style={styles.deepContent}>
            <AppText variant="body" color={colors.textSecondary}>{deepAnalysis.analysis || deepAnalysis.reasoning}</AppText>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.xs },
  tab: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  statusCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.sm },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  statusItem: { flex: 1, minWidth: 80, alignItems: 'center', padding: spacing.md, backgroundColor: colors.bgInput, borderRadius: borderRadius.md },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  messagesList: { marginHorizontal: spacing.md, gap: spacing.sm },
  messageCard: { padding: spacing.md },
  messageText: { padding: spacing.md, borderRadius: borderRadius.md, lineHeight: 20 },
  footer: { paddingHorizontal: spacing.md, marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  loadingCard: { padding: spacing.xl, alignItems: 'center' },
  signalCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  signalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  signalBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  confidenceBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.bgInput, borderRadius: borderRadius.full },
  barFill: { height: '100%', borderRadius: borderRadius.full },
  signalGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  signalItem: { flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: colors.bgInput, borderRadius: borderRadius.md },
  reasoning: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderPrimary },
  emptySignal: { padding: spacing.xl, alignItems: 'center' },
  deepCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  deepContent: { paddingTop: spacing.md, lineHeight: 24 },
});

function getPositionStatusColor(status: string) {
  if (status.startsWith('IN B')) return colors.success;
  if (status.startsWith('IN S')) return colors.error;
  return colors.info;
}

function getMessageColor(msg: string) {
  if (msg.includes('⚠️') || msg.includes('loss')) return colors.warning + '20';
  if (msg.includes('📈') || msg.includes('💡') || msg.includes('✅')) return colors.success + '20';
  if (msg.includes('⏳') || msg.includes('🔍') || msg.includes('🔄')) return colors.info + '20';
  return colors.surface;
}

function getSignalBgColor(signal: string) {
  if (signal === 'BUY') return colors.success;
  if (signal === 'SELL') return colors.error;
  if (signal === 'HOLD') return colors.warning;
  return colors.info;
}

function getConfidenceColor(conf: number) {
  if (conf >= 70) return colors.success;
  if (conf >= 40) return colors.warning;
  return colors.error;
}