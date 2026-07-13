import React from 'react';
import { View, ViewStyle, StyleSheet, Dimensions } from 'react-native';
import { LineChart, Grid } from 'react-native-chart-kit';
import { colors, spacing, borderRadius } from '@/theme';
import { AppText } from './Text';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  height?: number;
  showVolume?: boolean;
}

export const CandlestickChart = ({ data, entryPrice, stopLoss, takeProfit, height = 280, showVolume = false }: CandlestickChartProps) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <AppText variant="body" color={colors.textMuted}>No chart data available</AppText>
      </View>
    );
  }

  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05 || 100;

  const chartData = {
    labels: data.map((_, i) => i % Math.ceil(data.length / 6) === 0 ? new Date(data[i].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    datasets: [
      {
        data: prices,
        color: colors.chartUp,
        strokeWidth: 2,
      },
    ],
    legend: ['Price'],
  };

  return (
    <View style={{ width: chartWidth, height }}>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={height}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
            style: {
              borderRadius: borderRadius.md,
            },
            propsForDots: {
              r: 0,
              strokeWidth: 0,
              stroke: colors.chartUp,
            },
            propsForBackgroundLines: {
              strokeWidth: 0.5,
              stroke: colors.borderSecondary,
            },
          }}
          bezier
          style={styles.chart}
          verticalLabelRotation={30}
        />
        {entryPrice && (
          <View style={[styles.levelLine, { top: ((maxPrice + padding - entryPrice) / (maxPrice + padding - (minPrice - padding))) * height - 1 }]}>
            <AppText variant="caption" color={colors.primary} style={styles.levelLabel}>Entry ${entryPrice.toFixed(2)}</AppText>
          </View>
        )}
        {stopLoss && (
          <View style={[styles.levelLine, { top: ((maxPrice + padding - stopLoss) / (maxPrice + padding - (minPrice - padding))) * height - 1, backgroundColor: colors.error }]}>
            <AppText variant="caption" color={colors.error} style={styles.levelLabel}>SL ${stopLoss.toFixed(2)}</AppText>
          </View>
        )}
        {takeProfit && (
          <View style={[styles.levelLine, { top: ((maxPrice + padding - takeProfit) / (maxPrice + padding - (minPrice - padding))) * height - 1, backgroundColor: colors.success }]}>
            <AppText variant="caption" color={colors.success} style={styles.levelLabel}>TP ${takeProfit.toFixed(2)}</AppText>
          </View>
        )}
      </View>
    </View>
  );
};

interface SimpleLineChartProps {
  data: number[];
  color?: string;
  height?: number;
  showGrid?: boolean;
}

export const SimpleLineChart = ({ data, color = colors.primary, height = 120, showGrid = false }: SimpleLineChartProps) => {
  if (!data || data.length < 2) return null;

  return (
    <View style={{ width: chartWidth, height }}>
      <LineChart
        data={{
          labels: data.map((_, i) => i % Math.ceil(data.length / 6) === 0 ? i.toString() : ''),
          datasets: [{ data, color, strokeWidth: 2 }],
        }}
        width={chartWidth}
        height={height}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          color: (opacity = 1) => `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          style: { borderRadius: borderRadius.md },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export const Sparkline = ({ data, color = colors.primary, height = 40, width = 100 }: SparklineProps) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));

  const path = `M${points.map((p, i) => `${i === 0 ? '' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={path} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
};

import Svg, { Path } from 'react-native-svg';

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chartContainer: { flex: 1, borderRadius: borderRadius.md, overflow: 'hidden' },
  chart: { marginVertical: spacing.xs, borderRadius: borderRadius.md },
  levelLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  levelLabel: {
    position: 'absolute',
    right: spacing.sm,
    top: -18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
});