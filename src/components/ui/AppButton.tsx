import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../../config/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textSizeStyles[size], variantTextStyles[variant], icon ? styles.textWithIcon : undefined]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textWithIcon: {
    marginLeft: spacing.sm,
  },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.base },
  lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.lg },
};

const textSizeStyles: Record<Size, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },
};

const variantTextStyles: Record<Variant, TextStyle> = {
  primary: { color: colors.textInverse },
  secondary: { color: colors.primary },
  outline: { color: colors.text },
  ghost: { color: colors.primary },
  danger: { color: colors.textInverse },
};
