import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Receipt, MessageCircle, Printer } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppButton, SyncBadge } from '../../components/ui';
import { PrinterDevicePickerModal } from '../../components/PrinterDevicePickerModal';
import { transactionRepository } from '../../repositories/transactionRepository';
import { buildReceiptData } from '../../services/printerService';
import { usePrintReceipt } from '../../hooks/usePrintReceipt';
import { Transaction, TransactionItem } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function TransactionDetailScreen() {
  const route = useRoute<any>();
  const { localId } = route.params;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const printReceiptFlow = usePrintReceipt();

  useEffect(() => {
    (async () => {
      const txn = await transactionRepository.getById(localId);
      setTransaction(txn);
      if (txn) {
        const txnItems = await transactionRepository.getItems(txn.local_id);
        setItems(txnItems);
      }
    })();
  }, [localId]);

  const handleWhatsApp = () => {
    if (!transaction) return;
    const itemLines = items.map((i) => `  ${i.product_name} x${i.quantity} = ${formatCurrency(i.subtotal)}`).join('\n');
    const paymentLabel = ({ cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' } as Record<string, string>)[transaction.payment_method] ?? transaction.payment_method;
    const message = `🧾 *Struk*\n${transaction.transaction_number}\n\n${itemLines}\n\nTotal: *${formatCurrency(transaction.total)}*\nPembayaran: ${paymentLabel}\n\nTerima kasih!`;
    const phone = transaction.customer_whatsapp?.replace(/\D/g, '') || '';
    const url = phone
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handlePrintReceipt = () => {
    if (!transaction) return;
    printReceiptFlow.handlePrint(buildReceiptData(transaction, items));
  };

  if (!transaction) return null;

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Receipt size={28} color={colors.primary} />
        </View>
        <AppText variant="sectionTitle">{transaction.transaction_number}</AppText>
        <AppText variant="captionMuted">{formatDateTime(transaction.transaction_date)}</AppText>
        <SyncBadge status={transaction.sync_status} style={styles.badge} />
      </View>

      <AppCard style={styles.section}>
        <AppText variant="bodySemibold" style={styles.sectionTitle}>Daftar Item</AppText>
        {items.map((item) => (
          <View key={item.local_id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <AppText variant="body">{item.product_name}</AppText>
              <AppText variant="captionMuted">
                {formatCurrency(item.product_price)} × {item.quantity}
              </AppText>
            </View>
            <AppText variant="bodySemibold">{formatCurrency(item.subtotal)}</AppText>
          </View>
        ))}
      </AppCard>

      <AppCard style={styles.section}>
        <DetailRow label="Subtotal" value={formatCurrency(transaction.subtotal)} />
        {transaction.discount > 0 && (
          <DetailRow label="Diskon" value={`-${formatCurrency(transaction.discount)}`} isRed />
        )}
        {transaction.tax > 0 && (
          <DetailRow label="Pajak" value={formatCurrency(transaction.tax)} />
        )}
        <View style={styles.totalRow}>
          <AppText variant="sectionTitle">Total</AppText>
          <AppText variant="numberLarge" style={{ color: colors.primary }}>
            {formatCurrency(transaction.total)}
          </AppText>
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <DetailRow label="Pembayaran" value={({ cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' } as Record<string, string>)[transaction.payment_method] ?? transaction.payment_method.toUpperCase()} />
        <DetailRow label="Karyawan" value={transaction.employee_name} />
        {transaction.customer_name && <DetailRow label="Pelanggan" value={transaction.customer_name} />}
        {transaction.customer_whatsapp && <DetailRow label="WhatsApp" value={transaction.customer_whatsapp} />}
        {transaction.notes && <DetailRow label="Catatan" value={transaction.notes} />}
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
          title="Kirim WhatsApp"
          onPress={handleWhatsApp}
          variant="secondary"
          icon={<MessageCircle size={18} color={colors.primary} />}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm }}
        />
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

function DetailRow({ label, value, isRed }: { label: string; value: string; isRed?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" style={isRed ? { color: colors.error } : undefined}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    marginTop: spacing.sm,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actions: {
    marginTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
