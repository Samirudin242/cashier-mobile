import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '../../config/theme';
import type { SyncStatus } from '../../types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const syncStatusVariant: Record<SyncStatus, BadgeVariant> = {
  pending_upload: 'warning',
  synced: 'success',
  failed: 'error',
  pending_delete: 'muted',
  conflict: 'error',
};

const syncStatusLabel: Record<SyncStatus, string> = {
  pending_upload: 'Menunggu',
  synced: 'Tersinkron',
  failed: 'Gagal',
  pending_delete: 'Menghapus',
  conflict: 'Konflik',
};

export function AppBadge({ label, variant = 'info', style }: Props) {
  return (
    <View style={[styles.badge, variantStyles[variant], style]}>
      <Text style={[styles.text, textStyles[variant]]}>{label}</Text>
    </View>
  );
}

export function SyncBadge({ status, style }: { status: SyncStatus; style?: ViewStyle }) {
  return (
    <AppBadge
      label={syncStatusLabel[status]}
      variant={syncStatusVariant[status]}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  success: { backgroundColor: colors.successLight },
  warning: { backgroundColor: colors.warningLight },
  error: { backgroundColor: colors.errorLight },
  info: { backgroundColor: colors.primaryLight },
  muted: { backgroundColor: colors.borderLight },
};

const textStyles: Record<BadgeVariant, { color: string }> = {
  success: { color: colors.success },
  warning: { color: colors.warning },
  error: { color: colors.error },
  info: { color: colors.primary },
  muted: { color: colors.textSecondary },
};
