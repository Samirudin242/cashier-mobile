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
      'Hapus Data Lokal',
      'Ini akan menghapus SEMUA data lokal termasuk data yang belum disinkronkan. Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
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
              Alert.alert('Selesai', 'Semua data lokal telah dihapus.');
            } catch (err: any) {
              Alert.alert('Kesalahan', err.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Pengaturan</AppText>

      <AppCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <User size={24} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="sectionTitle">{user?.name}</AppText>
            <AppText variant="captionMuted">Kode: {user?.access_code}</AppText>
            <View style={styles.roleBadge}>
              <AppText variant="captionMuted" style={styles.roleText}>
                {user?.role === 'owner' ? 'Pemilik' : 'Karyawan'}
              </AppText>
            </View>
          </View>
        </View>
      </AppCard>

      <AppSectionHeader title="Toko" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Info Toko"
          subtitle={`ID Toko: ${user?.store_id ?? 'N/A'}`}
          left={<Store size={18} color={colors.textSecondary} />}
          showChevron
        />
      </AppCard>

      <AppSectionHeader title="Data" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Database"
          subtitle="Penyimpanan lokal SQLite"
          left={<Database size={18} color={colors.textSecondary} />}
        />
        <AppListItem
          title="Hapus Data Lokal"
          subtitle="Hapus semua data lokal"
          left={<Trash2 size={18} color={colors.error} />}
          onPress={handleClearData}
          showChevron
        />
      </AppCard>

      <AppSectionHeader title="Tentang" />
      <AppCard padded={false} style={styles.listCard}>
        <AppListItem
          title="Versi"
          subtitle="1.0.0"
          left={<Info size={18} color={colors.textSecondary} />}
        />
        <AppListItem
          title="Privasi"
          subtitle="Semua data tersimpan di perangkat"
          left={<Shield size={18} color={colors.textSecondary} />}
        />
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
