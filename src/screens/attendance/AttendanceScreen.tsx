import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, AppBadge, AppEmptyState, AppSectionHeader } from '../../components/ui';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { useAuthStore } from '../../stores/authStore';
import { Attendance } from '../../types';
import { formatDate, formatTime, todayDateString } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function AttendanceScreen() {
  const { user, deviceId } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [today, hist] = await Promise.all([
      attendanceRepository.getTodayForEmployee(user.id),
      attendanceRepository.getByEmployee(user.id, 20),
    ]);
    setTodayAttendance(today);
    setHistory(hist);
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleClockIn = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const hour = new Date().getHours();
      const status = hour > 9 ? 'late' : 'present';
      await attendanceRepository.clockIn({
        employee_id: user.id,
        employee_name: user.name,
        date: todayDateString(),
        status,
        device_id: deviceId,
      });
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    try {
      await attendanceRepository.clockOut(todayAttendance.local_id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    present: colors.success,
    late: colors.warning,
    absent: colors.error,
    leave: colors.textSecondary,
  };

  const renderItem = ({ item }: { item: Attendance }) => (
    <AppCard style={styles.histCard}>
      <View style={styles.histRow}>
        <View style={[styles.histDot, { backgroundColor: statusColors[item.status] ?? colors.textMuted }]} />
        <View style={styles.histInfo}>
          <AppText variant="bodyMedium">{formatDate(item.date)}</AppText>
          <AppText variant="captionMuted">
            {formatTime(item.clock_in)}
            {item.clock_out ? ` — ${formatTime(item.clock_out)}` : ' (active)'}
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          variant={item.status === 'present' ? 'success' : item.status === 'late' ? 'warning' : 'error'}
        />
      </View>
    </AppCard>
  );

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Attendance</AppText>

      <AppCard style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Clock size={20} color={colors.primary} />
          <AppText variant="sectionTitle" style={styles.todayTitle}>Today</AppText>
        </View>

        {todayAttendance ? (
          <View>
            <View style={styles.todayDetail}>
              <View style={styles.todayTimeBox}>
                <LogIn size={14} color={colors.success} />
                <AppText variant="bodyMedium" style={styles.todayTimeText}>
                  {formatTime(todayAttendance.clock_in)}
                </AppText>
              </View>
              {todayAttendance.clock_out ? (
                <View style={styles.todayTimeBox}>
                  <LogOut size={14} color={colors.error} />
                  <AppText variant="bodyMedium" style={styles.todayTimeText}>
                    {formatTime(todayAttendance.clock_out)}
                  </AppText>
                </View>
              ) : (
                <AppBadge label="Active" variant="success" />
              )}
            </View>
            {!todayAttendance.clock_out && (
              <AppButton
                title="Clock Out"
                onPress={handleClockOut}
                loading={loading}
                variant="danger"
                icon={<LogOut size={16} color={colors.textInverse} />}
                fullWidth
                size="lg"
                style={styles.clockBtn}
              />
            )}
          </View>
        ) : (
          <View>
            <AppText variant="captionMuted" style={styles.noClock}>
              You haven't clocked in today
            </AppText>
            <AppButton
              title="Clock In"
              onPress={handleClockIn}
              loading={loading}
              icon={<LogIn size={16} color={colors.textInverse} />}
              fullWidth
              size="lg"
              style={styles.clockBtn}
            />
          </View>
        )}
      </AppCard>

      <AppSectionHeader title="History" />
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.local_id}
        scrollEnabled={false}
        ListEmptyComponent={
          <AppEmptyState
            icon={<Clock size={40} color={colors.textMuted} />}
            title="No Records"
            message="Your attendance history will appear here"
          />
        }
      />
      <View style={{ height: spacing.xxl }} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  todayCard: {
    padding: spacing.lg,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  todayTitle: {
    marginLeft: spacing.sm,
  },
  todayDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  todayTimeText: {
    marginLeft: spacing.xs,
  },
  noClock: {
    marginBottom: spacing.md,
  },
  clockBtn: {
    marginTop: spacing.md,
  },
  histCard: {
    marginBottom: spacing.sm,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  histDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  histInfo: {
    flex: 1,
  },
});
