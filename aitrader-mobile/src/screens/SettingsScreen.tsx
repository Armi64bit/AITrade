import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { AppText, Heading, Label, Caption, Body } from '@/components/Text';
import { Button, Card } from '@/components/Button';
import { Input } from '@/components/Input';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { api } from '@/services/api';
import { SYMBOLS } from '@/constants';

export const SettingsScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiKey, setApiKey] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* General */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>General</Heading>
        
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>Push Notifications</Label>
              <Caption color={colors.textSecondary}>Receive alerts for trades and signals</Caption>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary }} thumbColor={notifications ? colors.textInverse : colors.textMuted} />
          </View>
        </Card>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>Sound Effects</Label>
              <Caption color={colors.textSecondary}>Play sounds for trade events</Caption>
            </View>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: colors.primary }} thumbColor={soundEnabled ? colors.textInverse : colors.textMuted} />
          </View>
        </Card>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>Auto Refresh</Label>
              <Caption color={colors.textSecondary}>Automatically update data</Caption>
            </View>
            <Switch value={autoRefresh} onValueChange={setAutoRefresh} trackColor={{ true: colors.primary }} thumbColor={autoRefresh ? colors.textInverse : colors.textMuted} />
          </View>
        </Card>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo} style={{ flex: 1 }}>
              <Label>Refresh Interval</Label>
              <Caption color={colors.textSecondary}>Seconds between updates</Caption>
            </View>
            <Input
              value={refreshInterval.toString()}
              onChangeText={(v) => setRefreshInterval(parseInt(v) || 30)}
              keyboardType="numeric"
              placeholder="30"
              style={{ width: 80, textAlign: 'right' }}
            />
          </View>
        </Card>
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>Appearance</Heading>
        
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>Theme</Label>
              <Caption color={colors.textSecondary}>App color scheme</Caption>
            </View>
            <View style={styles.themeSelector}>
              {(['dark', 'light'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setTheme(t)} style={[styles.themeOption, theme === t && styles.themeOptionActive]}>
                  <AppText variant="caption" weight="semibold" color={theme === t ? colors.textInverse : colors.textSecondary}>{t.toUpperCase()}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>
      </View>

      {/* Trading */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>Trading</Heading>
        
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo} style={{ flex: 1 }}>
              <Label>Trading Pair</Label>
              <Caption color={colors.textSecondary}>Default symbol for new sessions</Caption>
            </View>
            <Input
              value={SYMBOLS[0]}
              onChangeText={() => {}}
              editable={false}
              placeholder="BTC/USDT"
              style={{ width: 120 }}
            />
          </View>
        </Card>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>Max Concurrent Positions</Label>
              <Caption color={colors.textSecondary}>Limit simultaneous open trades</Caption>
            </View>
            <Input value="1" onChangeText={() => {}} keyboardType="numeric" editable={false} placeholder="1" style={{ width: 80, textAlign: 'right' }} />
          </View>
        </Card>
      </View>

      {/* API Configuration */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>API Keys</Heading>
        
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Label>OpenRouter API Key</Label>
              <Caption color={colors.textSecondary}>For AI analysis and signals</Caption>
            </View>
            <Input
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              placeholder="sk-or-..."
              style={{ width: '100%', marginTop: spacing.sm }}
            />
          </View>
        </Card>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo} style={{ flex: 1 }}>
              <Label>Binance API Key</Label>
              <Caption color={colors.textSecondary}>For live trading (not paper)</Caption>
            </View>
            <Button title="Configure" variant="outline" size="sm" onPress={() => {}} />
          </View>
        </Card>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>Data Management</Heading>
        
        <View style={styles.actionsGrid}>
          <Button title="Export Trade History" variant="outline" size="md" fullWidth onPress={() => {}} />
          <Button title="Clear Cache" variant="outline" size="md" fullWidth onPress={() => {}} />
          <Button title="Reset All Data" variant="danger" size="md" fullWidth onPress={() => {}} />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Heading level={3} style={styles.sectionTitle}>About</Heading>
        
        <Card style={styles.settingCard}>
          <View style={styles.aboutItem}>
            <AppText variant="body" weight="medium">AiTrader Mobile</AppText>
            <AppText variant="caption" color={colors.textSecondary}>Version 1.0.0</AppText>
          </View>
          <View style={styles.aboutItem}>
            <AppText variant="body" weight="medium">Backend API</AppText>
            <AppText variant="caption" color={colors.textSecondary}>https://aitrade-production-ecba.up.railway.app</AppText>
          </View>
          <View style={styles.aboutItem}>
            <AppText variant="body" weight="medium">Web Dashboard</AppText>
            <AppText variant="caption" color={colors.textSecondary}>https://aitrade-production-ecba.up.railway.app</AppText>
          </View>
        </Card>

        <View style={styles.actionsGrid}>
          <Button title="View Documentation" variant="outline" size="md" fullWidth onPress={() => {}} />
          <Button title="Report Bug" variant="outline" size="md" fullWidth onPress={() => {}} />
          <Button title="Request Feature" variant="outline" size="md" fullWidth onPress={() => {}} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  settingCard: { marginBottom: spacing.sm },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1 },
  themeSelector: { flexDirection: 'row', gap: spacing.sm },
  themeOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.bgInput },
  themeOptionActive: { backgroundColor: colors.primary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  aboutItem: { marginBottom: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});