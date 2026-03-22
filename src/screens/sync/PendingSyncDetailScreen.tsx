import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Package,
  ArrowRightLeft,
  User,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import {
  AppScreen,
  AppCard,
  AppText,
  AppSectionHeader,
} from '../../components/ui';
import { syncRepository } from '../../repositories/syncRepository';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

const ENTITY_LABELS: Record<string, string> = {
  products: 'Produk',
  transactions: 'Transaksi',
  customers: 'Pelanggan',
  attendance: 'Absensi',
};

type PendingDetail = {
  products: { local_id: string; name: string; sku: string; sync_status: string }[];
  transactions: { local_id: string; transaction_number: string; transaction_date: string; total: number; sync_status: string }[];
  customers: { local_id: string; name: string; whatsapp: string; sync_status: string }[];
  attendance: { local_id: string; employee_name: string; date: string; clock_in: string; sync_status: string }[];
};

export function PendingSyncDetailScreen() {
  const navigation = useNavigation<any>();
  const [detail, setDetail] = useState<PendingDetail | null>(null);

  const loadData = useCallback(async () => {
    const d = await syncRepository.getPendingSyncDetail();
    setDetail(d);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalCount =
    (detail?.products.length ?? 0) +
    (detail?.transactions.length ?? 0) +
    (detail?.customers.length ?? 0) +
    (detail?.attendance.length ?? 0);

  if (!detail) return null;


  const sections = [
    {
      key: 'products',
      data: detail.products,
      renderItem: ({ item }: any) => (
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="captionMuted">SKU: {item.sku}</AppText>
          </View>
          <StatusBadge status={item.sync_status} />
        </View>
      ),
    },
    {
      key: 'transactions',
      data: detail.transactions,
      renderItem: ({ item }: any) => (
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <AppText variant="bodyMedium">{item.transaction_number}</AppText>
            <AppText variant="captionMuted">
              {formatDate(item.transaction_date)} · {formatCurrency(item.total)}
            </AppText>
          </View>
          <StatusBadge status={item.sync_status} />
        </View>
      ),
    },
    {
      key: 'customers',
      data: detail.customers,
      renderItem: ({ item }: any) => (
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="captionMuted">{item.whatsapp}</AppText>
          </View>
          <StatusBadge status={item.sync_status} />
        </View>
      ),
    },
    {
      key: 'attendance',
      data: detail.attendance,
      renderItem: ({ item }: any) => (
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <AppText variant="bodyMedium">{item.employee_name}</AppText>
            <AppText variant="captionMuted">
              {item.date} · Masuk: {item.clock_in?.split('T')[1]?.slice(0, 5) ?? '-'}
            </AppText>
          </View>
          <StatusBadge status={item.sync_status} />
        </View>
      ),
    },
  ].filter((s) => s.data.length > 0);

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.title}>
        Data Menunggu Sinkronisasi
      </AppText>
      <AppText variant="captionMuted" style={styles.subtitle}>
        {totalCount} data belum tersinkronisasi
      </AppText>

      {sections.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <RefreshCw size={32} color={colors.textMuted} />
          <AppText variant="body" style={styles.emptyText}>
            Tidak ada data menunggu sinkronisasi
          </AppText>
        </AppCard>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <AppSectionHeader
              title={`${ENTITY_LABELS[section.key]} (${section.data.length})`}
            />
            <AppCard style={styles.listCard}>
              {section.data.map((item: any, index: number) => (
                <View key={item.local_id}>
                  {section.renderItem({ item })}
                  {index < section.data.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </AppCard>
          </View>
        ))
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.syncButton}
          onPress={() => navigation.navigate('SyncMain')}
        >
          <RefreshCw size={20} color={colors.primary} />
          <AppText variant="bodySemibold" style={styles.syncButtonText}>
            Buka Pusat Sinkronisasi
          </AppText>
          <ChevronRight size={20} color={colors.primary} />
        </Pressable>
      </View>
    </AppScreen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === 'failed'
      ? 'Gagal'
      : status === 'pending_delete'
        ? 'Hapus'
        : 'Menunggu';
  return (
    <View
      style={[
        styles.badge,
        status === 'failed' && styles.badgeFailed,
        status === 'pending_delete' && styles.badgeDelete,
      ]}
    >
      <AppText variant="caption" style={styles.badgeText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },
  subtitle: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  listCard: {
    marginHorizontal: spacing.base,
    paddingVertical: 0,
    paddingHorizontal: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 0,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.warningLight,
  },
  badgeFailed: {
    backgroundColor: colors.error + '20',
  },
  badgeDelete: {
    backgroundColor: colors.warning + '30',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  emptyCard: {
    marginHorizontal: spacing.base,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  actions: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  syncButtonText: {
    color: colors.primary,
  },
});
