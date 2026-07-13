import React from 'react';
import { View, ViewStyle, TextStyle, StyleSheet, TouchableOpacity, LinearGradient } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  onPress?: () => void;
  gradient?: boolean;
  border?: boolean;
  shadow?: boolean;
}

export const Card = React.forwardRef<View, CardProps>(
  ({ children, style, padding = spacing.md, onPress, gradient = false, border = true, shadow = true, ...props }, ref) => {
    const containerStyle: ViewStyle = {
      backgroundColor: gradient ? 'transparent' : colors.bgCard,
      borderRadius: borderRadius.lg,
      padding,
      borderWidth: border ? 1 : 0,
      borderColor: colors.borderPrimary,
      ...(shadow ? shadows.md : {}),
      ...style,
    };

    if (onPress) {
      return (
        <TouchableOpacity
          ref={ref}
          style={containerStyle}
          onPress={onPress}
          activeOpacity={0.85}
          {...props}
        >
          {gradient && (
            <LinearGradient
              colors={colors.gradientCard}
              style={{ ...StyleSheet.absoluteFillObject, borderRadius: borderRadius.lg }}
            />
          )}
          <View style={{ flex: 1 }}>{children}</View>
        </TouchableOpacity>
      );
    }

    return (
      <View ref={ref} style={containerStyle} {...props}>
        {gradient && (
          <LinearGradient
            colors={colors.gradientCard}
            style={{ ...StyleSheet.absoluteFillObject, borderRadius: borderRadius.lg }}
          />
        )}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    )
  }
);

Card.displayName = 'Card';

export const GradientCard = ({ children, style, colors = colors.gradientPrimary, ...props }: CardProps & { colors?: string[] }) => (
  <LinearGradient colors={colors} style={[styles.gradientCard, style]} {...props}>
    <View style={{ flex: 1, padding: spacing.md }}>{children}</View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradientCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

export const Section = ({ children, title, style }: { children: React.ReactNode; title?: string; style?: ViewStyle }) => (
  <View style={[styles.section, style]}>
    {title && (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    )}
    <View>{children}</View>
  </View>
);

import { Text } from './Text';

const sectionStyles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.textPrimary },
});