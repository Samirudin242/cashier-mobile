import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Trash2,
  Clock,
  TrendingUp,
  Wallet,
  Award,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, AppBadge, AppStatCard, AppSectionHeader } from '../../components/ui';
import { userRepository } from '../../repositories/userRepository';
import { User, EmployeeSalary } from '../../types';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import { generateSalaryPdf } from '../../services/salaryPdfService';
import { colors, spacing, radius } from '../../config/theme';

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function EmployeeSalaryScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { employeeId } = route.params;

  const [employee, setEmployee] = useState<User | null>(null);
  const [salary, setSalary] = useState<EmployeeSalary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadEmployee = useCallback(async () => {
    const emp = await userRepository.getById(employeeId);
    setEmployee(emp);
  }, [employeeId]);

  const loadSalary = useCallback(async () => {
    if (!employee) return;
    const { start, end } = getMonthRange(year, month);

    const [attendance, transactions] = await Promise.all([
      userRepository.getEmployeeAttendance(employee.id, start, end),
      userRepository.getEmployeeTransactionBonus(employee.id, start, end, employee.bonus_percent),
    ]);

    const daysWorked = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
    const daysLate = attendance.filter((a: any) => a.status === 'late').length;
    const baseSalary = daysWorked * employee.daily_salary;
    const bonus = transactions.reduce((sum: number, t: any) => sum + t.bonus, 0);

    setSalary({
      employee,
      daysWorked,
      daysLate,
      baseSalary,
      bonus,
      totalSalary: baseSalary + bonus,
      periodStart: start,
      periodEnd: end,
      transactions,
      attendanceDetails: attendance.map((a: any) => ({
        date: a.date,
        status: a.status,
        clockIn: a.clock_in ? formatTime(a.clock_in) : '-',
        clockOut: a.clock_out ? formatTime(a.clock_out) : null,
      })),
    });
  }, [employee, year, month]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);
  useEffect(() => { loadSalary(); }, [loadSalary]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleDownloadPdf = async () => {
    if (!salary) return;
    setPdfLoading(true);
    try {
      await generateSalaryPdf(salary);
    } catch (err: any) {
      Alert.alert('Kesalahan', err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EmployeeForm', { employeeId: employee?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Nonaktifkan Karyawan',
      `Apakah Anda yakin ingin menonaktifkan ${employee?.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan',
          style: 'destructive',
          onPress: async () => {
            await userRepository.deactivateEmployee(employee!.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!employee || !salary) return null;

  return (
    <AppScreen scroll>
      {/* Employee Header */}
      <AppCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <AppText variant="titleLarge" style={styles.avatarText}>
              {employee.name.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="sectionTitle">{employee.name}</AppText>
            <AppText variant="captionMuted">Kode: {employee.access_code}</AppText>
            <AppText variant="caption">Gaji/Hari: {formatCurrency(employee.daily_salary)}</AppText>
            <AppText variant="caption">Bonus: {employee.bonus_percent}%</AppText>
          </View>
        </View>
        <View style={styles.profileActions}>
          <Pressable style={styles.iconBtn} onPress={handleEdit}>
            <Edit3 size={16} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleDelete}>
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        </View>
      </AppCard>

      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <Pressable onPress={prevMonth} style={styles.monthArrow}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.monthLabel}>
          <Calendar size={16} color={colors.primary} />
          <AppText variant="bodySemibold" style={styles.monthText}>
            {MONTH_NAMES[month]} {year}
          </AppText>
        </View>
        <Pressable onPress={nextMonth} style={styles.monthArrow}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Salary Summary */}
      <View style={styles.statsRow}>
        <AppStatCard
          title="Hari Kerja"
          value={String(salary.daysWorked)}
          subtitle={`${salary.daysLate} terlambat`}
          icon={<Clock size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Gaji Pokok"
          value={formatCurrency(salary.baseSalary)}
          subtitle={`${salary.daysWorked} × ${formatCurrency(employee.daily_salary)}`}
          icon={<Wallet size={16} color={colors.success} />}
          accentColor={colors.success}
        />
      </View>

      <View style={styles.statsRow}>
        <AppStatCard
          title={`Bonus ${employee.bonus_percent}%`}
          value={formatCurrency(salary.bonus)}
          subtitle={`${salary.transactions.length} transaksi`}
          icon={<Award size={16} color={colors.warning} />}
          accentColor={colors.warning}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Total Gaji"
          value={formatCurrency(salary.totalSalary)}
          subtitle="Pokok + Bonus"
          icon={<TrendingUp size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
      </View>

      {/* Attendance Detail */}
      <AppSectionHeader title="Detail Absensi" />
      {salary.attendanceDetails.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText variant="captionMuted" style={styles.emptyText}>Belum ada data absensi bulan ini</AppText>
        </AppCard>
      ) : (
        salary.attendanceDetails.map((a, i) => (
          <AppCard key={i} style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.statusDot, { backgroundColor: a.status === 'present' ? colors.success : a.status === 'late' ? colors.warning : colors.error }]} />
              <View style={styles.detailInfo}>
                <AppText variant="bodyMedium">{a.date}</AppText>
                <AppText variant="captionMuted">{a.clockIn}{a.clockOut ? ` — ${a.clockOut}` : ''}</AppText>
              </View>
              <AppBadge
                label={({ present: 'Hadir', late: 'Terlambat', absent: 'Absen', leave: 'Cuti' } as Record<string, string>)[a.status] ?? a.status}
                variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'error'}
              />
            </View>
          </AppCard>
        ))
      )}

      {/* Bonus Detail */}
      <AppSectionHeader title="Detail Bonus Penjualan" />
      {salary.transactions.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText variant="captionMuted" style={styles.emptyText}>Belum ada transaksi bulan ini</AppText>
        </AppCard>
      ) : (
        salary.transactions.map((t, i) => (
          <AppCard key={i} style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailInfo}>
                <AppText variant="bodyMedium">
                  {t.transactionNumber ? `${t.transactionNumber} · ` : ''}{t.date.split('T')[0]}
                </AppText>
                <AppText variant="captionMuted">
                  Item: {formatCurrency(t.itemsTotal)} − Penanganan: {formatCurrency(t.handlingTotal)} = {formatCurrency(t.net)}
                </AppText>
              </View>
              <View style={styles.bonusCol}>
                <AppText variant="caption" style={styles.bonusLabel}>Bonus {employee.bonus_percent}%</AppText>
                <AppText variant="bodySemibold" style={styles.bonusValue}>{formatCurrency(t.bonus)}</AppText>
              </View>
            </View>
          </AppCard>
        ))
      )}

      {/* Download PDF */}
      <View style={styles.pdfSection}>
        <AppButton
          title="Unduh Slip Gaji (PDF)"
          onPress={handleDownloadPdf}
          loading={pdfLoading}
          fullWidth
          size="lg"
          icon={<Download size={18} color={colors.textInverse} />}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    padding: spacing.lg,
    marginTop: spacing.base,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  avatarText: {
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
  },
  monthArrow: {
    padding: spacing.sm,
  },
  monthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  monthText: {
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  detailCard: {
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  detailInfo: {
    flex: 1,
  },
  bonusCol: {
    alignItems: 'flex-end',
  },
  bonusLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bonusValue: {
    color: colors.warning,
    fontSize: 14,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  pdfSection: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
