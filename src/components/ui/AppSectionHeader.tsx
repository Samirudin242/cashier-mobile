import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../../config/theme';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AppSectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle">{title}</AppText>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
