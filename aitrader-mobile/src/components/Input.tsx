import React from 'react';
import { View, TextInput, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { AppText } from './Text';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad';
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, placeholder, value, onChangeText, error, helperText, secureTextEntry = false, keyboardType = 'default', disabled = false, fullWidth = true, leftIcon, rightIcon, style }, ref) => {
    const hasError = !!error;
    const inputBg = disabled ? colors.bgInput : colors.bgInput;
    const borderColor = hasError ? colors.error : disabled ? colors.borderSecondary : colors.borderPrimary;
    const focusColor = hasError ? colors.error : colors.primary;

    return (
      <View style={{ width: fullWidth ? '100%' : 'auto', ...style }}>
        {label && (
          <AppText variant="caption" weight="medium" color={hasError ? colors.error : colors.textSecondary} style={styles.label}>
            {label}
          </AppText>
        )}
        <View style={styles.inputWrapper}>
          {leftIcon && <View style={styles.iconWrapper}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            disabled={disabled}
            style={[
              styles.input,
              { backgroundColor: inputBg, borderColor, color: disabled ? colors.textMuted : colors.textPrimary }
            ]}
            selectionColor={focusColor}
          />
          {rightIcon && <View style={styles.iconWrapper}>{rightIcon}</View>}
        </View>
        {(error || helperText) && (
          <AppText variant="caption" color={error ? colors.error : colors.textMuted} style={styles.helperText}>
            {error || helperText}
          </AppText>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export const TextArea = React.forwardRef<TextInput, Omit<InputProps, 'secureTextEntry' | 'keyboardType'>>(
  ({ label, placeholder, value, onChangeText, error, helperText, disabled = false, fullWidth = true, style }, ref) => {
    const hasError = !!error;

    return (
      <View style={{ width: fullWidth ? '100%' : 'auto', ...style }}>
        {label && (
          <AppText variant="caption" weight="medium" color={hasError ? colors.error : colors.textSecondary} style={styles.label}>
            {label}
          </AppText>
        )}
        <View style={styles.textAreaWrapper}>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            disabled={disabled}
            multiline
            numberOfLines={4}
            style={[
              styles.textArea,
              { backgroundColor: disabled ? colors.bgInput : colors.bgInput, borderColor: hasError ? colors.error : colors.borderPrimary, color: disabled ? colors.textMuted : colors.textPrimary }
            ]}
            selectionColor={hasError ? colors.error : colors.primary}
          />
        </View>
        {(error || helperText) && (
          <AppText variant="caption" color={error ? colors.error : colors.textMuted} style={styles.helperText}>
            {error || helperText}
          </AppText>
        )}
      </View>
    );
  }
);

TextArea.displayName = 'TextArea';

export const Select = ({ label, placeholder, value, onValueChange, options, error, helperText, disabled = false, fullWidth = true, style }: {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}) => {
  const hasError = !!error;

  return (
    <View style={{ width: fullWidth ? '100%' : 'auto', ...style }}>
      {label && (
        <AppText variant="caption" weight="medium" color={hasError ? colors.error : colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      )}
      <View style={styles.selectWrapper}>
        <TextInput
          value={value ? options.find(o => o.value === value)?.label || '' : ''}
          onChangeText={() => {}}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={false}
          disabled={disabled}
          style={[
            styles.selectInput,
            { backgroundColor: disabled ? colors.bgInput : colors.bgInput, borderColor: hasError ? colors.error : colors.borderPrimary, color: disabled ? colors.textMuted : colors.textPrimary }
          ]}
        />
        <View style={styles.selectArrow}>
          <AppText variant="caption" color={colors.textMuted}>▼</AppText>
        </View>
      </View>
      <View style={styles.dropdown}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => !disabled && onValueChange(opt.value)}
            disabled={disabled}
            style={styles.dropdownItem}
          >
            <AppText variant="body" color={opt.value === value ? colors.primary : colors.textPrimary} weight={opt.value === value ? 'semibold' : 'normal'}>
              {opt.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      {(error || helperText) && (
        <AppText variant="caption" color={error ? colors.error : colors.textMuted} style={styles.helperText}>
          {error || helperText}
        </AppText>
      )}
    </View>
  );
};

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  iconWrapper: { paddingHorizontal: spacing.xs },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.normal,
  },
  textAreaWrapper: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  textArea: {
    padding: spacing.md,
    fontSize: typography.sizes.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  selectInput: {
    flex: 1,
    height: 48,
    fontSize: typography.sizes.md,
  },
  selectArrow: { paddingLeft: spacing.md },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    zIndex: 100,
  },
  dropdownItem: { padding: spacing.md },
  helperText: { marginTop: spacing.xs },
});