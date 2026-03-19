import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { colors, spacing } from '../../config/theme';

interface Props {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AppEmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <AppText variant="sectionTitle" style={styles.title}>{title}</AppText>
      <AppText variant="caption" style={styles.message}>{message}</AppText>
      {actionLabel && onAction && (
        <AppButton title={actionLabel} onPress={onAction} variant="secondary" size="sm" style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  icon: {
    marginBottom: spacing.base,
    opacity: 0.5,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
  },
});
