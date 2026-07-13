import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/theme';

interface AppTextProps {
  children: React.ReactNode;
  variant?: 'display' | 'headline' | 'title' | 'body' | 'caption' | 'overline';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  color?: string;
  align?: 'auto' | 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: TextStyle;
  onPress?: () => void;
  selectable?: boolean;
}

const variantStyles: Record<AppTextProps['variant'], TextStyle> = {
  display: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, lineHeight: 48, letterSpacing: -1 },
  headline: { fontSize: typography.sizes.xxxl, fontWeight: typography.weights.bold, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold, lineHeight: 32 },
  body: { fontSize: typography.sizes.md, fontWeight: typography.weights.normal, lineHeight: 24 },
  caption: { fontSize: typography.sizes.sm, fontWeight: typography.weights.normal, lineHeight: 20 },
  overline: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 1 },
};

export const AppText = React.forwardRef<Text, AppTextProps>(
  ({ children, variant = 'body', weight = 'normal', color = colors.textPrimary, align = 'auto', numberOfLines, style, onPress, selectable = false, ...props }, ref) => {
    const Component = onPress ? Text : Text;
    
    return (
      <Component
        ref={ref}
        selectable={selectable}
        onPress={onPress}
        style={[
          variantStyles[variant],
          { fontWeight: typography.weights[weight], color, textAlign: align },
          style,
        ]}
        numberOfLines={numberOfLines}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

AppText.displayName = 'AppText';

export const Heading = ({ children, level = 1, ...props }: { children: React.ReactNode; level?: 1 | 2 | 3 | 4 } & Omit<AppTextProps, 'variant'>) => {
  const variants = { 1: 'display' as const, 2: 'headline' as const, 3: 'title' as const, 4: 'body' as const };
  return <AppText variant={variants[level]} {...props}>{children}</AppText>;
};

export const Body = ({ children, ...props }: AppTextProps) => <AppText variant="body" {...props}>{children}</AppText>;

export const Caption = ({ children, ...props }: AppTextProps) => <AppText variant="caption" color={colors.textMuted} {...props}>{children}</AppText>;

export const Label = ({ children, ...props }: AppTextProps) => (
  <AppText variant="caption" weight="semibold" color={colors.textSecondary} {...props}>{children}</AppText>
);

export const Value = ({ children, color = colors.textPrimary, ...props }: AppTextProps) => (
  <AppText variant="title" weight="bold" color={color} {...props}>{children}</AppText>
);

export const MonoText = ({ children, ...props }: AppTextProps) => (
  <AppText variant="body" style={{ fontFamily: 'monospace', ...props.style }} {...props}>{children}</AppText>
);