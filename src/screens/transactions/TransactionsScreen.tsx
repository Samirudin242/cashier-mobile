import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Receipt, ArrowRightLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppEmptyState, SyncBadge, AppModal, AppButton } from '../../components/ui';
import { transactionRepository } from '../../repositories/transactionRepository';
import { Transaction } from '../../types';
import {
  addLocalCalendarDays,
  formatCurrency,
  formatDateTime,
  isSameLocalCalendarDay,
} from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(() => startOfToday());
  const [dateModalVisible, setDateModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const data = await transactionRepository.getForLocalCalendarDay(filterDate, 100);
        if (!cancelled) {
          setTransactions(data);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [filterDate])
  );

  const today = startOfToday();
  const showingToday = isSameLocalCalendarDay(filterDate, today);
  const dateLabel = filterDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const dateLabelLong = filterDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const goPrevDay = () => setFilterDate(addLocalCalendarDays(filterDate, -1));
  const goNextDay = () => {
    if (!showingToday) setFilterDate(addLocalCalendarDays(filterDate, 1));
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <AppCard
      style={styles.card}
      onPress={() => navigation.navigate('TransactionDetail', { localId: item.local_id })}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Receipt size={18} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <AppText variant="bodyMedium">{item.transaction_number}</AppText>
          <View style={styles.meta}>
            <AppText variant="captionMuted">{formatDateTime(item.transaction_date)}</AppText>
            {item.customer_name && (
              <AppText variant="captionMuted"> · {item.customer_name}</AppText>
            )}
          </View>
        </View>
        <View style={styles.right}>
          <AppText variant="bodySemibold" style={{ color: colors.primary }}>
            {formatCurrency(item.total)}
          </AppText>
          <SyncBadge status={item.sync_status} style={styles.badge} />
        </View>
      </View>
    </AppCard>
  );

  return (
    <AppScreen scroll={false} padded={false}>
      <View style={styles.filterBar}>
        <Pressable
          onPress={() => setDateModalVisible(true)}
          style={({ pressed }) => [styles.filterChip, pressed && styles.filterChipPressed]}
        >
          <Calendar size={18} color={colors.primary} />
          <View style={styles.filterChipText}>
            <AppText variant="captionMuted">Tanggal</AppText>
            <AppText variant="bodyMedium">{showingToday ? `Hari ini · ${dateLabel}` : dateLabel}</AppText>
          </View>
        </Pressable>
        {!showingToday && (
          <Pressable onPress={() => setFilterDate(startOfToday())} style={styles.todayLink} hitSlop={8}>
            <AppText variant="bodyMedium" style={styles.todayLinkText}>
              Hari ini
            </AppText>
          </Pressable>
        )}
      </View>

      <AppModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        title="Pilih tanggal"
        primaryAction={{ label: 'Selesai', onPress: () => setDateModalVisible(false) }}
      >
        <View style={styles.dateStepper}>
          <Pressable onPress={goPrevDay} style={styles.stepperBtn} hitSlop={12}>
            <ChevronLeft size={28} color={colors.primary} />
          </Pressable>
          <AppText variant="bodyMedium" style={styles.stepperLabel}>
            {dateLabelLong}
          </AppText>
          <Pressable
            onPress={goNextDay}
            style={styles.stepperBtn}
            hitSlop={12}
            disabled={showingToday}
          >
            <ChevronRight size={28} color={showingToday ? colors.textMuted : colors.primary} />
          </Pressable>
        </View>
        <AppButton
          title="Lompat ke hari ini"
          variant="outline"
          onPress={() => setFilterDate(startOfToday())}
          style={styles.modalTodayBtn}
          fullWidth
        />
      </AppModal>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.local_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <AppEmptyState
              icon={<ArrowRightLeft size={48} color={colors.textMuted} />}
              title="Belum Ada Transaksi"
              message={
                showingToday
                  ? 'Transaksi yang selesai hari ini akan muncul di sini'
                  : `Tidak ada transaksi pada ${dateLabel}`
              }
            />
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipPressed: {
    opacity: 0.92,
    backgroundColor: colors.borderLight,
  },
  filterChipText: {
    flex: 1,
  },
  todayLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  todayLinkText: {
    color: colors.primary,
  },
  dateStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepperBtn: {
    padding: spacing.xs,
  },
  stepperLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
  },
  modalTodayBtn: {
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  badge: {
    marginTop: spacing.xs,
  },
});
