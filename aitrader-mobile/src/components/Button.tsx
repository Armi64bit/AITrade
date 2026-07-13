import React from 'react';
import { TouchableOpacity, View, ViewStyle, TextStyle, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { AppText } from './Text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonProps['variant'], { bg: string[]; text: string; border: string }> = {
  primary: { bg: colors.gradientPrimary, text: colors.textInverse, border: 'transparent' },
  secondary: { bg: colors.gradientSuccess, text: colors.textInverse, border: 'transparent' },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', text: colors.textPrimary, border: 'transparent' },
  danger: { bg: colors.gradientError, text: colors.textInverse, border: 'transparent' },
  success: { bg: colors.gradientSuccess, text: colors.textInverse, border: 'transparent' },
};

const sizeStyles: Record<ButtonProps['size'], { px: number; py: number; fontSize: number; iconSize: number }> = {
  sm: { px: spacing.md, py: spacing.xs, fontSize: typography.sizes.sm, iconSize: 14 },
  md: { px: spacing.lg, py: spacing.sm, fontSize: typography.sizes.md, iconSize: 18 },
  lg: { px: spacing.xl, py: spacing.md, fontSize: typography.sizes.lg, iconSize: 22 },
};

export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  ({ title, onPress, variant = 'primary', size = 'md', fullWidth = false, disabled = false, loading = false, leftIcon, rightIcon, style, textStyle }, ref) => {
    const { bg, text: textColor, border } = variantStyles[variant];
    const { px, py, fontSize, iconSize } = sizeStyles[size];
    const isGradient = variant === 'primary' || variant === 'secondary' || variant === 'danger' || variant === 'success';

    const containerStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: px,
      paddingVertical: py,
      borderRadius: borderRadius.md,
      borderWidth: border === 'transparent' ? 0 : 1,
      borderColor: border,
      backgroundColor: isGradient ? 'transparent' : bg,
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled || loading ? 0.6 : 1,
      ...(isGradient ? shadows.md : {}),
      ...style,
    };

    const textStyle: TextStyle = {
      fontSize,
      fontWeight: typography.weights.semibold,
      color: textColor,
      ...textStyle,
    };

    if (isGradient) {
      return (
        <LinearGradient ref={ref} colors={bg} style={containerStyle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.9}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: px, paddingVertical: py }}
          >
            {loading ? <ActivityIndicator size="small" color={textColor} /> : (
              <>
                {leftIcon && <View style={{ width: iconSize, height: iconSize }}>{leftIcon}</View>}
                <AppText style={textStyle}>{title}</AppText>
                {rightIcon && <View style={{ width: iconSize, height: iconSize }}>{rightIcon}</View>}
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      );
    }

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={containerStyle}
      >
        {loading ? <ActivityIndicator size="small" color={textColor} /> : (
          <>
            {leftIcon && <View style={{ width: iconSize, height: iconSize }}>{leftIcon}</View>}
            <AppText style={textStyle}>{title}</AppText>
            {rightIcon && <View style={{ width: iconSize, height: iconSize }}>{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export const IconButton = ({ onPress, icon, size = 40, variant = 'ghost', disabled, style }: {
  onPress: () => void;
  icon: React.ReactNode;
  size?: number;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) => {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.error : 'transparent';
  const textColor = variant === 'ghost' ? colors.textPrimary : colors.textInverse;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        ...(variant === 'ghost' ? { borderWidth: 1, borderColor: colors.borderPrimary } : {}),
        ...shadows.sm,
        ...style,
      }}
    >
      <View style={{ tintColor: textColor }}>{icon}</View>
    </TouchableOpacity>
  );
};

export const Chip = ({ label, onPress, selected, variant = 'default', style }: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  style?: ViewStyle;
}) => {
  const bg = selected 
    ? (variant === 'success' ? colors.success : variant === 'warning' ? colors.warning : variant === 'danger' ? colors.error : variant === 'info' ? colors.info : colors.primary)
    : colors.bgInput;
  const textColor = selected ? colors.textInverse : colors.textSecondary;
  const borderColor = selected ? 'transparent' : colors.borderPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: borderColor,
        ...style,
      }}
    >
      <AppText variant="caption" weight="semibold" color={textColor}>{label}</AppText>
    </TouchableOpacity>
  );
};