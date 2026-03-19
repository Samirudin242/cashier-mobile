import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Receipt, ArrowRightLeft } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppEmptyState, SyncBadge } from '../../components/ui';
import { transactionRepository } from '../../repositories/transactionRepository';
import { Transaction } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const data = await transactionRepository.getAll(100);
        setTransactions(data);
        setLoading(false);
      })();
    }, [])
  );

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
              title="No Transactions"
              message="Completed transactions will appear here"
            />
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
