import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Store,
  User,
  Database,
  Trash2,
  LogOut,
  ChevronRight,
  Info,
  Shield,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppListItem, AppSectionHeader, AppButton } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { getDatabase } from '../../database/sqlite/client';
import { colors, spacing, radius } from '../../config/theme';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will delete ALL local data including unsynced records. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.execAsync(`
                DELETE FROM transaction_items;
                DELETE FROM transactions;
                DELETE FROM products;
                DELETE FROM customers;
                DELETE FROM attendance;
                DELETE FROM payroll_cache;
                DELETE FROM salary_slip_metadata;
                DELETE FROM sync_log;
              `);
              Alert.alert('Done', 'All local data has been cleared.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Settings</AppText>

      <AppCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <User size={24} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="sectionTitle">{user?.name}</AppText>
            <AppText variant="captionMuted">Code: {user?.access_code}</AppText>
            <View style={styles.roleBadge}>
              <AppText variant="captionMuted" style={styles.roleText}>
                {user?.role === 'owner' ? 'Owner' : 'Employee'}
              </AppText>
            </View>
          </View>
        </View>
      </AppCard>

      <AppSectionHeader title="Store" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Store Info"
          subtitle={`Store ID: ${user?.store_id ?? 'N/A'}`}
          left={<Store size={18} color={colors.textSecondary} />}
          showChevron
        />
      </AppCard>

      <AppSectionHeader title="Data" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Database"
          subtitle="Local SQLite storage"
          left={<Database size={18} color={colors.textSecondary} />}
        />
        <AppListItem
          title="Clear Local Data"
          subtitle="Delete all local records"
          left={<Trash2 size={18} color={colors.error} />}
          onPress={handleClearData}
          showChevron
        />
      </AppCard>

      <AppSectionHeader title="About" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Version"
          subtitle="1.0.0"
          left={<Info size={18} color={colors.textSecondary} />}
        />
        <AppListItem
          title="Privacy"
          subtitle="All data stored locally"
          left={<Shield size={18} color={colors.textSecondary} />}
        />
      </AppCard>

      <View style={styles.logoutSection}>
        <AppButton
          title="Logout"
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

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  profileCard: {
    padding: spacing.lg,
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
  profileInfo: {
    flex: 1,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  listCard: {
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  logoutSection: {
    marginTop: spacing.xxl,
  },
});
