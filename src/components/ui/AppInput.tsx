import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { colors, spacing, radius, typography } from '../../config/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export function AppInput({ label, error, containerStyle, icon, style, ...props }: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  iconWrapper: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
