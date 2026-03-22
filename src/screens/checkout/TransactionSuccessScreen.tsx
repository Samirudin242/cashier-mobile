import React, { useState } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Printer, MessageCircle, Home } from 'lucide-react-native';
import { AppScreen, AppText, AppButton, AppCard, AppInput } from '../../components/ui';
import { formatCurrency, normalizeIndonesianPhoneForWhatsApp } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function TransactionSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { total, transactionNumber, customerWhatsapp: initialWhatsapp } = route.params;

  const [whatsapp, setWhatsapp] = useState(
    typeof initialWhatsapp === 'string' ? initialWhatsapp : ''
  );

  const handleWhatsApp = async () => {
    const message = `Struk: ${transactionNumber}\nTotal: ${formatCurrency(total)}\n\nTerima kasih atas pembelian Anda!`;
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
            onPress={() => {}}
            variant="outline"
            icon={<Printer size={18} color={colors.text} />}
            fullWidth
            size="lg"
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
