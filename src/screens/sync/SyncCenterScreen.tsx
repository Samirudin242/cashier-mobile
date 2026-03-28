import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Upload,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Check,
  Square,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, AppBadge, AppSectionHeader, AppModal } from '../../components/ui';
import { syncRepository } from '../../repositories/syncRepository';
import {
  uploadSync,
  UPLOAD_TYPE_OPTIONS,
  type UploadEntityType,
} from '../../services/sync/uploadSyncService';
import { downloadSync } from '../../services/sync/downloadSyncService';
import { useAuthStore } from '../../stores/authStore';
import { SyncSummary, SyncLogEntry } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

function emptyTypeSelection(): Record<UploadEntityType, boolean> {
  return Object.fromEntries(UPLOAD_TYPE_OPTIONS.map((o) => [o.id, false])) as Record<UploadEntityType, boolean>;
}

export function SyncCenterScreen() {
  const { deviceId } = useAuthStore();
  const [summary, setSummary] = useState<SyncSummary>({
    lastSyncTime: null,
    pendingUpload: 0,
    failedUpload: 0,
    totalSynced: 0,
  });
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [uploadSelection, setUploadSelection] = useState<Record<UploadEntityType, boolean>>(() => emptyTypeSelection());
  const [downloadPickerOpen, setDownloadPickerOpen] = useState(false);
  const [downloadSelection, setDownloadSelection] = useState<Record<UploadEntityType, boolean>>(() => emptyTypeSelection());

  const loadData = useCallback(async () => {
    const [s, l] = await Promise.all([
      syncRepository.getSummary(),
      syncRepository.getRecentLogs(15),
    ]);
    setSummary(s);
    setLogs(l);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openUploadPicker = () => {
    setUploadSelection(emptyTypeSelection());
    setUploadPickerOpen(true);
  };

  const toggleUploadType = (id: UploadEntityType) => {
    setUploadSelection((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleConfirmUpload = async () => {
    const types = UPLOAD_TYPE_OPTIONS.filter((o) => uploadSelection[o.id]).map((o) => o.id);
    if (types.length === 0) {
      Alert.alert('Pilih Data', 'Pilih minimal satu jenis data untuk diunggah.');
      return;
    }
    setUploadPickerOpen(false);
    setUploading(true);
    try {
      const result = await uploadSync(types);
      await loadData();
      const errLines = result.errors.slice(0, 5).join('\n');
      if (result.failed > 0) {
        Alert.alert(
          'Sinkronisasi Sebagian',
          `Diunggah: ${result.uploaded}\nGagal: ${result.failed}${errLines ? `\n\n${errLines}` : ''}`
        );
      } else if (result.errors.length > 0) {
        Alert.alert(
          'Sinkronisasi Selesai — peringatan',
          `Diunggah: ${result.uploaded}\n\n${errLines}`
        );
      } else {
        Alert.alert('Sinkronisasi Selesai', `${result.uploaded} data berhasil diunggah.`);
      }
    } catch (err: any) {
      Alert.alert('Kesalahan Sinkronisasi', err.message);
    } finally {
      setUploading(false);
    }
  };

  const openDownloadPicker = () => {
    setDownloadSelection(emptyTypeSelection());
    setDownloadPickerOpen(true);
  };

  const toggleDownloadType = (id: UploadEntityType) => {
    setDownloadSelection((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleConfirmDownload = async () => {
    const types = UPLOAD_TYPE_OPTIONS.filter((o) => downloadSelection[o.id]).map((o) => o.id);
    if (types.length === 0) {
      Alert.alert('Pilih Data', 'Pilih minimal satu jenis data untuk diunduh.');
      return;
    }
    setDownloadPickerOpen(false);
    setDownloading(true);
    try {
      const result = await downloadSync(deviceId, types);
      await loadData();
      if (result.failed > 0) {
        Alert.alert(
          'Unduhan Sebagian',
          `Diunduh: ${result.downloaded}\nGagal: ${result.failed}`
        );
      } else {
        Alert.alert('Unduhan Selesai', `${result.downloaded} data berhasil diunduh.`);
      }
    } catch (err: any) {
      Alert.alert('Kesalahan Unduhan', err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteLog = (log: SyncLogEntry) => {
    Alert.alert(
      'Hapus Aktivitas',
      'Apakah Anda yakin ingin menghapus log ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await syncRepository.deleteLog(log.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleClearAllLogs = () => {
    Alert.alert(
      'Hapus Semua Aktivitas',
      'Semua riwayat aktivitas sinkronisasi akan dihapus. Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            await syncRepository.clearAllLogs();
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <AppScreen scroll>
      <AppModal
        visible={uploadPickerOpen}
        onClose={() => setUploadPickerOpen(false)}
        title="Pilih data untuk diunggah"
        secondaryAction={{ label: 'Batal', onPress: () => setUploadPickerOpen(false) }}
        primaryAction={{
          label: 'Unggah',
          onPress: handleConfirmUpload,
        }}
      >
        <AppText variant="captionMuted" style={styles.pickerHint}>
          Centang satu atau lebih jenis data yang ingin dikirim ke cloud.
        </AppText>
        <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
          {UPLOAD_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={styles.pickerRow}
              onPress={() => toggleUploadType(opt.id)}
            >
              {uploadSelection[opt.id] ? (
                <Check size={22} color={colors.primary} />
              ) : (
                <Square size={22} color={colors.textMuted} />
              )}
              <AppText variant="bodyMedium" style={styles.pickerLabel}>{opt.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </AppModal>

      <AppModal
        visible={downloadPickerOpen}
        onClose={() => setDownloadPickerOpen(false)}
        title="Pilih data untuk diunduh"
        secondaryAction={{ label: 'Batal', onPress: () => setDownloadPickerOpen(false) }}
        primaryAction={{
          label: 'Unduh',
          onPress: handleConfirmDownload,
        }}
      >
        <AppText variant="captionMuted" style={styles.pickerHint}>
          Centang satu atau lebih jenis data yang ingin diambil dari cloud. Item baris transaksi ikut saat Transaksi dipilih.
        </AppText>
        <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
          {UPLOAD_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={styles.pickerRow}
              onPress={() => toggleDownloadType(opt.id)}
            >
              {downloadSelection[opt.id] ? (
                <Check size={22} color={colors.primary} />
              ) : (
                <Square size={22} color={colors.textMuted} />
              )}
              <AppText variant="bodyMedium" style={styles.pickerLabel}>{opt.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </AppModal>

      <AppText variant="title" style={styles.pageTitle}>Pusat Sinkronisasi</AppText>

      <AppCard style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <RefreshCw size={20} color={colors.primary} />
          <AppText variant="sectionTitle" style={styles.statusTitle}>Status Sinkronisasi</AppText>
        </View>

        <View style={styles.statusGrid}>
          <StatusItem
            icon={<Clock size={16} color={colors.textSecondary} />}
            label="Sinkronisasi Terakhir"
            value={summary.lastSyncTime ? formatDateTime(summary.lastSyncTime) : 'Belum Pernah'}
          />
          <StatusItem
            icon={<Upload size={16} color={colors.warning} />}
            label="Menunggu Unggah"
            value={String(summary.pendingUpload)}
            badgeVariant={summary.pendingUpload > 0 ? 'warning' : undefined}
          />
          <StatusItem
            icon={<AlertTriangle size={16} color={colors.error} />}
            label="Gagal"
            value={String(summary.failedUpload)}
            badgeVariant={summary.failedUpload > 0 ? 'error' : undefined}
          />
          <StatusItem
            icon={<CheckCircle size={16} color={colors.success} />}
            label="Total Tersinkron"
            value={String(summary.totalSynced)}
          />
        </View>
      </AppCard>

      <View style={styles.actionRow}>
        <AppButton
          title="Unggah Data"
          onPress={openUploadPicker}
          loading={uploading}
          disabled={downloading}
          icon={<Upload size={18} color={colors.textInverse} />}
          size="lg"
          style={styles.actionBtn}
        />
        <AppButton
          title="Unduh Data"
          onPress={openDownloadPicker}
          loading={downloading}
          disabled={uploading}
          variant="secondary"
          icon={<Download size={18} color={colors.primary} />}
          size="lg"
          style={styles.actionBtn}
        />
      </View>

      {logs.length > 0 && (
        <>
          <AppSectionHeader
            title="Aktivitas Terbaru"
            actionLabel="Hapus Semua"
            onAction={handleClearAllLogs}
          />
          {logs.map((log) => (
            <AppCard key={log.id} style={styles.logCard}>
              <View style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: log.status === 'success' ? colors.success : colors.error }]} />
                <View style={styles.logInfo}>
                  <AppText variant="bodyMedium">
                    {log.action === 'upload' ? '↑' : '↓'} {({ products: 'Produk', transactions: 'Transaksi', customers: 'Pelanggan', attendance: 'Absensi' } as Record<string, string>)[log.entity_type] ?? log.entity_type}
                  </AppText>
                  <AppText variant="captionMuted">{formatDateTime(log.timestamp)}</AppText>
                </View>
                <AppBadge
                  label={log.status === 'success' ? 'Berhasil' : 'Gagal'}
                  variant={log.status === 'success' ? 'success' : 'error'}
                  style={styles.logBadge}
                />
                <Pressable onPress={() => handleDeleteLog(log)} hitSlop={8} style={styles.logDeleteBtn}>
                  <Trash2 size={14} color={colors.textMuted} />
                </Pressable>
              </View>
              {log.error_message && (
                <AppText variant="captionMuted" style={styles.logError} numberOfLines={2}>
                  {log.error_message}
                </AppText>
              )}
            </AppCard>
          ))}
        </>
      )}

      <View style={{ height: spacing.xxl }} />
    </AppScreen>
  );
}

function StatusItem({ icon, label, value, badgeVariant }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badgeVariant?: 'warning' | 'error';
}) {
  return (
    <View style={styles.statusItem}>
      <View style={styles.statusItemHeader}>
        {icon}
        <AppText variant="captionMuted" style={styles.statusItemLabel}>{label}</AppText>
      </View>
      <View style={styles.statusItemValue}>
        <AppText variant="bodySemibold">{value}</AppText>
        {badgeVariant && (
          <View style={[styles.statusDot, { backgroundColor: badgeVariant === 'warning' ? colors.warning : colors.error }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  statusCard: {
    padding: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  statusTitle: {
    marginLeft: spacing.sm,
  },
  statusGrid: {
    gap: spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statusItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItemLabel: {
    marginLeft: spacing.sm,
  },
  statusItemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
  pickerHint: {
    marginBottom: spacing.md,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pickerLabel: {
    flex: 1,
  },
  logCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logBadge: {
    marginRight: spacing.sm,
  },
  logDeleteBtn: {
    padding: spacing.xs,
  },
  logError: {
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
    color: colors.error,
  },
});
