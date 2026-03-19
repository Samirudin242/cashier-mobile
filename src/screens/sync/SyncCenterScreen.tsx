import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Upload,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  CloudOff,
  RefreshCw,
} from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, AppBadge, AppSectionHeader } from '../../components/ui';
import { syncRepository } from '../../repositories/syncRepository';
import { uploadSync } from '../../services/sync/uploadSyncService';
import { downloadSync } from '../../services/sync/downloadSyncService';
import { useAuthStore } from '../../stores/authStore';
import { SyncSummary, SyncLogEntry } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function SyncCenterScreen() {
  const { deviceId, user } = useAuthStore();
  const [summary, setSummary] = useState<SyncSummary>({
    lastSyncTime: null,
    pendingUpload: 0,
    failedUpload: 0,
    totalSynced: 0,
  });
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const handleUpload = async () => {
    setUploading(true);
    try {
      const result = await uploadSync();
      await loadData();
      if (result.failed > 0) {
        Alert.alert(
          'Sync Partial',
          `Uploaded: ${result.uploaded}\nFailed: ${result.failed}\n\n${result.errors.slice(0, 3).join('\n')}`
        );
      } else {
        Alert.alert('Sync Complete', `${result.uploaded} records uploaded successfully.`);
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await downloadSync(deviceId);
      await loadData();
      if (result.failed > 0) {
        Alert.alert(
          'Download Partial',
          `Downloaded: ${result.downloaded}\nFailed: ${result.failed}`
        );
      } else {
        Alert.alert('Download Complete', `${result.downloaded} records downloaded.`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Sync Center</AppText>

      <AppCard style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <RefreshCw size={20} color={colors.primary} />
          <AppText variant="sectionTitle" style={styles.statusTitle}>Sync Status</AppText>
        </View>

        <View style={styles.statusGrid}>
          <StatusItem
            icon={<Clock size={16} color={colors.textSecondary} />}
            label="Last Sync"
            value={summary.lastSyncTime ? formatDateTime(summary.lastSyncTime) : 'Never'}
          />
          <StatusItem
            icon={<Upload size={16} color={colors.warning} />}
            label="Pending Upload"
            value={String(summary.pendingUpload)}
            badgeVariant={summary.pendingUpload > 0 ? 'warning' : undefined}
          />
          <StatusItem
            icon={<AlertTriangle size={16} color={colors.error} />}
            label="Failed"
            value={String(summary.failedUpload)}
            badgeVariant={summary.failedUpload > 0 ? 'error' : undefined}
          />
          <StatusItem
            icon={<CheckCircle size={16} color={colors.success} />}
            label="Total Synced"
            value={String(summary.totalSynced)}
          />
        </View>
      </AppCard>

      <View style={styles.actionRow}>
        <AppButton
          title="Upload Sync"
          onPress={handleUpload}
          loading={uploading}
          disabled={downloading}
          icon={<Upload size={18} color={colors.textInverse} />}
          size="lg"
          style={styles.actionBtn}
        />
        <AppButton
          title="Download Sync"
          onPress={handleDownload}
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
          <AppSectionHeader title="Recent Activity" />
          {logs.map((log) => (
            <AppCard key={log.id} style={styles.logCard}>
              <View style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: log.status === 'success' ? colors.success : colors.error }]} />
                <View style={styles.logInfo}>
                  <AppText variant="bodyMedium">
                    {log.action === 'upload' ? '↑' : '↓'} {log.entity_type}
                  </AppText>
                  <AppText variant="captionMuted">{formatDateTime(log.timestamp)}</AppText>
                </View>
                <AppBadge
                  label={log.status}
                  variant={log.status === 'success' ? 'success' : 'error'}
                />
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
  logError: {
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
    color: colors.error,
  },
});
