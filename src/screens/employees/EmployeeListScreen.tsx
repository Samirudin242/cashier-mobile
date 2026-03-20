import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { UserPlus, Users, ChevronRight, Wallet } from 'lucide-react-native';
import { AppScreen, AppText, AppCard, AppBadge, AppEmptyState, AppButton } from '../../components/ui';
import { userRepository } from '../../repositories/userRepository';
import { User } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

export function EmployeeListScreen() {
  const navigation = useNavigation<any>();
  const [employees, setEmployees] = useState<User[]>([]);

  const loadData = useCallback(async () => {
    const data = await userRepository.getEmployees();
    setEmployees(data);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const renderItem = ({ item }: { item: User }) => (
    <Pressable onPress={() => navigation.navigate('EmployeeSalary', { employeeId: item.id })}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <AppText variant="bodySemibold" style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.info}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="captionMuted">Kode: {item.access_code}</AppText>
          </View>
          <View style={styles.salaryCol}>
            <AppText variant="caption" style={styles.salaryLabel}>Gaji/Hari</AppText>
            <AppText variant="bodySemibold" style={styles.salaryValue}>
              {formatCurrency(item.daily_salary)}
            </AppText>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </AppCard>
    </Pressable>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppText variant="title">Karyawan</AppText>
        <AppButton
          title="Tambah"
          onPress={() => navigation.navigate('EmployeeForm')}
          size="sm"
          icon={<UserPlus size={16} color={colors.textInverse} />}
        />
      </View>

      <FlatList
        data={employees}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <AppEmptyState
            icon={<Users size={40} color={colors.textMuted} />}
            title="Belum Ada Karyawan"
            message="Tambahkan karyawan pertama untuk mulai mengelola gaji"
            actionLabel="Tambah Karyawan"
            onAction={() => navigation.navigate('EmployeeForm')}
          />
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  salaryCol: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  salaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  salaryValue: {
    color: colors.success,
    fontSize: 14,
  },
});
