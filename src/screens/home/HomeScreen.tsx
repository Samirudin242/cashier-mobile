import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ShoppingCart,
  Package,
  ArrowRightLeft,
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react-native';
import { AppScreen, AppText, AppCard, AppStatCard, AppSectionHeader } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { transactionRepository } from '../../repositories/transactionRepository';
import { productRepository } from '../../repositories/productRepository';
import { syncRepository } from '../../repositories/syncRepository';
import { colors, spacing, radius, shadows } from '../../config/theme';
import { formatCurrency } from '../../utils/helpers';

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({ todayTotal: 0, todayCount: 0, productCount: 0, pendingSync: 0 });

  const loadStats = useCallback(async () => {
    const [todayData, productCount, syncSummary] = await Promise.all([
      transactionRepository.getTodayTotal(),
      productRepository.getCount(),
      syncRepository.getSummary(),
    ]);
    setStats({
      todayTotal: todayData.total,
      todayCount: todayData.count,
      productCount,
      pendingSync: syncSummary.pendingUpload,
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadStats);
    return unsubscribe;
  }, [navigation, loadStats]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  };

  return (
    <AppScreen scroll>
      <View style={styles.headerSection}>
        <View>
          <AppText variant="caption">{greeting()}</AppText>
          <AppText variant="title" style={styles.userName}>{user?.name ?? 'Pengguna'}</AppText>
        </View>
        <View style={styles.roleTag}>
          <AppText variant="captionMuted" style={styles.roleText}>
            {user?.role === 'owner' ? 'Pemilik' : 'Karyawan'}
          </AppText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <AppStatCard
          title="Penjualan Hari Ini"
          value={formatCurrency(stats.todayTotal)}
          subtitle={`${stats.todayCount} transaksi`}
          icon={<DollarSign size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Produk"
          value={String(stats.productCount)}
          subtitle="Total aktif"
          icon={<Package size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
      </View>

      {stats.pendingSync > 0 && (
        <Pressable onPress={() => navigation.navigate(user?.role === 'owner' ? 'SyncStack' : 'SyncTab')}>
          <AppCard style={styles.syncBanner}>
            <View style={styles.syncBannerContent}>
              <ArrowRightLeft size={18} color={colors.warning} />
              <View style={styles.syncBannerText}>
                <AppText variant="bodyMedium" style={{ color: colors.warning }}>
                  {stats.pendingSync} menunggu sinkronisasi
                </AppText>
                <AppText variant="captionMuted">Ketuk untuk sinkronkan data</AppText>
              </View>
            </View>
          </AppCard>
        </Pressable>
      )}

      <AppSectionHeader title="Aksi Cepat" />
      <View style={styles.actionsGrid}>
        <QuickAction
          icon={<ShoppingCart size={22} color={colors.primary} />}
          label="Penjualan Baru"
          onPress={() => navigation.navigate('CheckoutStack')}
        />
        <QuickAction
          icon={<Package size={22} color={colors.success} />}
          label="Produk"
          onPress={() => navigation.navigate('ProductsTab')}
        />
        <QuickAction
          icon={<ArrowRightLeft size={22} color={colors.warning} />}
          label="Transaksi"
          onPress={() => navigation.navigate('TransactionsTab')}
        />
        <QuickAction
          icon={<Clock size={22} color={colors.error} />}
          label="Absensi"
          onPress={() => navigation.navigate('AttendanceStack')}
        />
      </View>
    </AppScreen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>
      <AppText variant="caption" style={styles.actionLabel}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  userName: {
    marginTop: spacing.xs,
  },
  roleTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  syncBanner: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: {
    marginLeft: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontWeight: '500',
  },
});
