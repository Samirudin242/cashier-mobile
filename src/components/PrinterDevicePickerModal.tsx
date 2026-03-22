import React from 'react';
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ThermalPrinterDevice } from 'react-native-thermal-pos-printer';
import { AppModal, AppText, AppButton } from './ui';
import { colors, spacing } from '../config/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  devices: ThermalPrinterDevice[];
  loading: boolean;
  onRefresh: () => void;
  onSelectDevice: (device: ThermalPrinterDevice) => void;
}

export function PrinterDevicePickerModal({
  visible,
  onClose,
  devices,
  loading,
  onRefresh,
  onSelectDevice,
}: Props) {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Pilih Printer Bluetooth"
      secondaryAction={{ label: 'Tutup', onPress: onClose }}
    >
      <AppText variant="captionMuted" style={styles.hint}>
        Pasangkan EPPOS RPP02 di Pengaturan → Bluetooth terlebih dahulu, lalu ketuk Segarkan.
      </AppText>
      <AppButton
        title="Segarkan daftar"
        onPress={onRefresh}
        variant="outline"
        loading={loading}
        style={styles.refresh}
      />
      {loading && devices.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : devices.length === 0 ? (
        <AppText variant="body" style={styles.empty}>
          Tidak ada perangkat Bluetooth yang terpasang. Tambahkan printer di pengaturan sistem.
        </AppText>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.getAddress()}
          scrollEnabled={devices.length > 4}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelectDevice(item)}
            >
              <AppText variant="bodySemibold">{item.getName() || 'Printer'}</AppText>
              <AppText variant="captionMuted">{item.getAddress()}</AppText>
            </Pressable>
          )}
        />
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: spacing.md,
  },
  refresh: {
    marginBottom: spacing.md,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: spacing.lg,
    color: colors.textSecondary,
  },
  list: {
    maxHeight: 280,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowPressed: {
    backgroundColor: colors.borderLight,
  },
});
