import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Calendar,
} from 'lucide-react-native';
import { AppScreen, AppText, AppCard, AppStatCard, AppSectionHeader } from '../../components/ui';
import { transactionRepository } from '../../repositories/transactionRepository';
import { productRepository } from '../../repositories/productRepository';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function ReportsScreen() {
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });
  const [productCount, setProductCount] = useState(0);
  const [dailySummary, setDailySummary] = useState<{ date: string; total: number; count: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [today, pCount, daily] = await Promise.all([
          transactionRepository.getTodayTotal(),
          productRepository.getCount(),
          transactionRepository.getDailySummary(7),
        ]);
        setTodayStats(today);
        setProductCount(pCount);
        setDailySummary(daily);
      })();
    }, [])
  );

  const weekTotal = dailySummary.reduce((s, d) => s + d.total, 0);
  const weekCount = dailySummary.reduce((s, d) => s + d.count, 0);
  const avgPerDay = dailySummary.length > 0 ? weekTotal / dailySummary.length : 0;

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Reports</AppText>

      <View style={styles.statsRow}>
        <AppStatCard
          title="Today's Revenue"
          value={formatCurrency(todayStats.total)}
          subtitle={`${todayStats.count} transactions`}
          icon={<DollarSign size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Total Products"
          value={String(productCount)}
          subtitle="Active items"
          icon={<ShoppingCart size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
      </View>

      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <AppStatCard
          title="7-Day Revenue"
          value={formatCurrency(weekTotal)}
          subtitle={`${weekCount} transactions`}
          icon={<TrendingUp size={16} color={colors.warning} />}
          accentColor={colors.warning}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Daily Average"
          value={formatCurrency(avgPerDay)}
          subtitle="Per day"
          icon={<BarChart3 size={16} color={colors.primaryDark} />}
          accentColor={colors.primaryDark}
        />
      </View>

      <AppSectionHeader title="Daily Breakdown" />
      {dailySummary.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText variant="captionMuted" style={{ textAlign: 'center' }}>
            No transaction data yet
          </AppText>
        </AppCard>
      ) : (
        dailySummary.map((day) => (
          <AppCard key={day.date} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <View style={styles.dayIconWrap}>
                <Calendar size={16} color={colors.primary} />
              </View>
              <View style={styles.dayInfo}>
                <AppText variant="bodyMedium">{formatDate(day.date)}</AppText>
                <AppText variant="captionMuted">{day.count} transactions</AppText>
              </View>
              <AppText variant="bodySemibold" style={{ color: colors.primary }}>
                {formatCurrency(day.total)}
              </AppText>
            </View>
          </AppCard>
        ))
      )}

      <View style={{ height: spacing.xxl }} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
  },
  emptyCard: {
    padding: spacing.xl,
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dayInfo: {
    flex: 1,
  },
});
