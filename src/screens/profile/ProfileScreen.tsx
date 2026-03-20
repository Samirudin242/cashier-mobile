import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  User,
  Clock,
  ShoppingCart,
  LogOut,
  Calendar,
  TrendingUp,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, AppStatCard, AppSectionHeader } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { transactionRepository } from '../../repositories/transactionRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, late: 0, absent: 0, leave: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const today = await transactionRepository.getTodayTotal();
        setTodayStats(today);

        const now = new Date();
        const summary = await attendanceRepository.getMonthSummary(user.id, now.getFullYear(), now.getMonth() + 1);
        setAttendanceSummary(summary);
      })();
    }, [user])
  );

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={32} color={colors.primary} />
        </View>
        <AppText variant="title">{user?.name}</AppText>
        <AppText variant="captionMuted">Kode: {user?.access_code}</AppText>
        <View style={styles.roleBadge}>
          <AppText variant="captionMuted" style={styles.roleText}>
            {user?.role === 'owner' ? 'Pemilik' : 'Karyawan'}
          </AppText>
        </View>
      </View>

      <AppSectionHeader title="Performa Hari Ini" />
      <View style={styles.statsRow}>
        <AppStatCard
          title="Penjualan"
          value={formatCurrency(todayStats.total)}
          subtitle={`${todayStats.count} transaksi`}
          icon={<TrendingUp size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Bulan Ini"
          value={`${attendanceSummary.present + attendanceSummary.late}`}
          subtitle="Hari hadir"
          icon={<Calendar size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
      </View>

      <AppSectionHeader title="Ringkasan Absensi" />
      <AppCard style={styles.attendanceCard}>
        <View style={styles.attendanceGrid}>
          <AttendanceStat label="Hadir" value={attendanceSummary.present} color={colors.success} />
          <AttendanceStat label="Terlambat" value={attendanceSummary.late} color={colors.warning} />
          <AttendanceStat label="Absen" value={attendanceSummary.absent} color={colors.error} />
          <AttendanceStat label="Cuti" value={attendanceSummary.leave} color={colors.textSecondary} />
        </View>
      </AppCard>

      <View style={styles.logoutSection}>
        <AppButton
          title="Keluar"
          onPress={handleLogout}
          variant="danger"
          icon={<LogOut size={18} color={colors.textInverse} />}
          fullWidth
          size="lg"
        />
      </View>

      <View style={{ height: spacing.xxl }} />
    </AppScreen>
  );
}

function AttendanceStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.attStatItem}>
      <View style={[styles.attDot, { backgroundColor: color }]} />
      <AppText variant="captionMuted">{label}</AppText>
      <AppText variant="numberMedium">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  roleText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  attendanceCard: {
    padding: spacing.lg,
  },
  attendanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attStatItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  attDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoutSection: {
    marginTop: spacing.xxl,
  },
});
