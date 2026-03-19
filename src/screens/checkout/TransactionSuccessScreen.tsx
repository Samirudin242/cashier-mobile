import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Printer, MessageCircle, Home } from 'lucide-react-native';
import { AppScreen, AppText, AppButton, AppCard } from '../../components/ui';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius } from '../../config/theme';

export function TransactionSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { total, transactionNumber } = route.params;

  const handleWhatsApp = () => {
    const message = `Receipt: ${transactionNumber}\nTotal: ${formatCurrency(total)}\n\nThank you for your purchase!`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {});
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

        <AppText variant="titleLarge" style={styles.title}>Transaction Complete!</AppText>
        <AppText variant="captionMuted" style={styles.txnNumber}>{transactionNumber}</AppText>

        <AppCard style={styles.totalCard}>
          <AppText variant="caption" style={styles.totalLabel}>Total Payment</AppText>
          <AppText variant="numberLarge" style={styles.totalValue}>
            {formatCurrency(total)}
          </AppText>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Print Receipt"
            onPress={() => {}}
            variant="outline"
            icon={<Printer size={18} color={colors.text} />}
            fullWidth
            size="lg"
          />
          <AppButton
            title="Send via WhatsApp"
            onPress={handleWhatsApp}
            variant="secondary"
            icon={<MessageCircle size={18} color={colors.primary} />}
            fullWidth
            size="lg"
            style={styles.actionGap}
          />
          <AppButton
            title="Back to Home"
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
    marginBottom: spacing.xl,
  },
  totalLabel: {
    marginBottom: spacing.sm,
  },
  totalValue: {
    color: colors.primary,
  },
  actions: {
    width: '100%',
  },
  actionGap: {
    marginTop: spacing.sm,
  },
});
