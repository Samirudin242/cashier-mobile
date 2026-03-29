import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Printer, MessageCircle, Home } from 'lucide-react-native';
import { AppScreen, AppText, AppButton, AppCard, AppInput } from '../../components/ui';
import { PrinterDevicePickerModal } from '../../components/PrinterDevicePickerModal';
import { transactionRepository } from '../../repositories/transactionRepository';
import { formatCurrency, normalizeIndonesianPhoneForWhatsApp } from '../../utils/helpers';
import { buildReceiptData, formatReceiptTextForWhatsApp } from '../../services/printerService';
import { usePrintReceipt } from '../../hooks/usePrintReceipt';
import { Transaction, TransactionItem } from '../../types';
import { colors, spacing, radius } from '../../config/theme';

export function TransactionSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { transactionId, total, transactionNumber, customerWhatsapp: initialWhatsapp } = route.params;

  const [whatsapp, setWhatsapp] = useState(
    typeof initialWhatsapp === 'string' ? initialWhatsapp : ''
  );
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const printReceiptFlow = usePrintReceipt();

  useEffect(() => {
    if (!transactionId) return;
    (async () => {
      const txnItems = await transactionRepository.getItems(transactionId);
      setItems(txnItems);
      const txn = await transactionRepository.getById(transactionId);
      if (txn) {
        setTransaction(txn);
      }
    })();
  }, [transactionId]);

  const handlePrintReceipt = () => {
    if (!transaction) {
      Alert.alert('Tunggu sebentar', 'Data transaksi masih dimuat.');
      return;
    }
    printReceiptFlow.handlePrint(buildReceiptData(transaction, items));
  };

  const handleWhatsApp = async () => {
    if (!transaction) {
      Alert.alert('Tunggu sebentar', 'Data transaksi masih dimuat.');
      return;
    }
    const message = formatReceiptTextForWhatsApp(buildReceiptData(transaction, items));
    const phone = normalizeIndonesianPhoneForWhatsApp(whatsapp.trim());

    if (!phone) {
      Alert.alert(
        'Nomor tidak valid',
        'Masukkan nomor WhatsApp Indonesia, contoh: 082347497133 atau 6282347497133'
      );
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Kesalahan', 'Tidak dapat membuka WhatsApp. Pastikan aplikasi WhatsApp terpasang.');
    }
  };

  const handleHome = () => {
    navigation.popToTop();
  };

  return (
    <AppScreen scroll>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <CheckCircle size={64} color={colors.success} />
        </View>

        <AppText variant="titleLarge" style={styles.title}>Transaksi Berhasil!</AppText>
        <AppText variant="captionMuted" style={styles.txnNumber}>{transactionNumber}</AppText>

        <AppCard style={styles.totalCard}>
          <AppText variant="caption" style={styles.totalLabel}>Total Pembayaran</AppText>
          <AppText variant="numberLarge" style={styles.totalValue}>
            {formatCurrency(total)}
          </AppText>
        </AppCard>

        <AppCard style={styles.waCard}>
          <AppText variant="sectionTitle" style={styles.waTitle}>Kirim struk ke WhatsApp</AppText>
          <AppText variant="captionMuted" style={styles.waHint}>
            Nomor pelanggan (Indonesia), contoh: 082347497133
          </AppText>
          <AppInput
            label="Nomor WhatsApp"
            placeholder="082347497133"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Cetak Struk"
            onPress={handlePrintReceipt}
            variant="outline"
            icon={<Printer size={18} color={colors.text} />}
            fullWidth
            size="lg"
            loading={printReceiptFlow.isPrinting}
          />
          <AppButton
            title="Kirim via WhatsApp"
            onPress={handleWhatsApp}
            variant="secondary"
            icon={<MessageCircle size={18} color={colors.primary} />}
            fullWidth
            size="lg"
            style={styles.actionGap}
          />
          <AppButton
            title="Kembali ke Beranda"
            onPress={handleHome}
            icon={<Home size={18} color={colors.textInverse} />}
            fullWidth
            size="lg"
            style={styles.actionGap}
          />
        </View>
      </View>

      <PrinterDevicePickerModal
        visible={printReceiptFlow.showPicker}
        onClose={printReceiptFlow.closePicker}
        devices={printReceiptFlow.devices}
        loading={printReceiptFlow.loadingDevices}
        onRefresh={printReceiptFlow.loadDevices}
        onSelectDevice={printReceiptFlow.selectDeviceAndPrint}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.xs,
  },
  txnNumber: {
    marginBottom: spacing.xl,
  },
  totalCard: {
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.base,
  },
  totalLabel: {
    marginBottom: spacing.sm,
  },
  totalValue: {
    color: colors.primary,
  },
  waCard: {
    width: '100%',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  waTitle: {
    marginBottom: spacing.xs,
  },
  waHint: {
    marginBottom: spacing.md,
  },
  actions: {
    width: '100%',
  },
  actionGap: {
    marginTop: spacing.sm,
  },
});
