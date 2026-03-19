import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { colors, spacing } from '../../config/theme';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export function AppStatCard({ title, value, subtitle, icon, accentColor = colors.primary }: Props) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
            {icon}
          </View>
        )}
        <AppText variant="caption" style={styles.title}>{title}</AppText>
      </View>
      <AppText variant="numberMedium" style={styles.value}>{value}</AppText>
      {subtitle && <AppText variant="captionMuted" style={styles.subtitle}>{subtitle}</AppText>}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
  },
  value: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
