import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Minus, Plus, Trash2, CreditCard, Banknote, QrCode } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppButton } from '../../components/ui';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { transactionRepository } from '../../repositories/transactionRepository';
import { formatCurrency } from '../../utils/helpers';
import { CartItem } from '../../types';
import { colors, spacing, radius } from '../../config/theme';

export function CartReviewScreen() {
  const navigation = useNavigation<any>();
  const {
    items, customerName, customerWhatsapp, paymentMethod, discount, notes,
    updateQuantity, removeItem, setCustomerName, setCustomerWhatsapp,
    setPaymentMethod, setDiscount, setNotes, getSubtotal, getTotal, clear,
  } = useCartStore();
  const { user, deviceId } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const subtotal = getSubtotal();
  const total = getTotal();

  const handleComplete = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const txn = await transactionRepository.create({
        items,
        customer_name: customerName || undefined,
        customer_whatsapp: customerWhatsapp || undefined,
        employee_id: user!.id,
        employee_name: user!.name,
        discount,
        payment_method: paymentMethod,
        notes: notes || undefined,
        device_id: deviceId,
      });
      clear();
      navigation.replace('TransactionSuccess', {
        transactionId: txn.local_id,
        total: txn.total,
        transactionNumber: txn.transaction_number,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <AppCard style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <AppText variant="bodyMedium" numberOfLines={1}>{item.product.name}</AppText>
          <AppText variant="caption" style={{ color: colors.primary }}>
            {formatCurrency(item.product.price)}
          </AppText>
        </View>
        <View style={styles.qtyControls}>
          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.local_id, item.quantity - 1)}>
            <Minus size={14} color={colors.text} />
          </Pressable>
          <AppText variant="bodySemibold" style={styles.qtyValue}>{item.quantity}</AppText>
          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.local_id, item.quantity + 1)}>
            <Plus size={14} color={colors.text} />
          </Pressable>
        </View>
        <AppText variant="bodySemibold" style={styles.itemSubtotal}>
          {formatCurrency(item.product.price * item.quantity)}
        </AppText>
        <Pressable onPress={() => removeItem(item.product.local_id)} hitSlop={8}>
          <Trash2 size={16} color={colors.error} />
        </Pressable>
      </View>
    </AppCard>
  );

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.title}>Cart Review</AppText>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.product.local_id}
        scrollEnabled={false}
      />

      <AppCard style={styles.section}>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>Customer Info</AppText>
        <AppInput
          label="Customer Name"
          placeholder="Optional"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <AppInput
          label="WhatsApp Number"
          placeholder="e.g. 08123456789"
          value={customerWhatsapp}
          onChangeText={setCustomerWhatsapp}
          keyboardType="phone-pad"
        />
      </AppCard>

      <AppCard style={styles.section}>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>Payment</AppText>
        <View style={styles.paymentRow}>
          <PaymentOption
            icon={<Banknote size={18} color={paymentMethod === 'cash' ? colors.textInverse : colors.text} />}
            label="Cash"
            selected={paymentMethod === 'cash'}
            onPress={() => setPaymentMethod('cash')}
          />
          <PaymentOption
            icon={<CreditCard size={18} color={paymentMethod === 'transfer' ? colors.textInverse : colors.text} />}
            label="Transfer"
            selected={paymentMethod === 'transfer'}
            onPress={() => setPaymentMethod('transfer')}
          />
          <PaymentOption
            icon={<QrCode size={18} color={paymentMethod === 'qris' ? colors.textInverse : colors.text} />}
            label="QRIS"
            selected={paymentMethod === 'qris'}
            onPress={() => setPaymentMethod('qris')}
          />
        </View>
        <AppInput
          label="Discount"
          placeholder="0"
          value={discount ? String(discount) : ''}
          onChangeText={(v) => setDiscount(parseFloat(v) || 0)}
          keyboardType="numeric"
        />
        <AppInput
          label="Notes"
          placeholder="Optional notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </AppCard>

      <AppCard style={styles.totalCard}>
        <View style={styles.totalRow}>
          <AppText variant="body">Subtotal</AppText>
          <AppText variant="body">{formatCurrency(subtotal)}</AppText>
        </View>
        {discount > 0 && (
          <View style={styles.totalRow}>
            <AppText variant="body">Discount</AppText>
            <AppText variant="body" style={{ color: colors.error }}>-{formatCurrency(discount)}</AppText>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandTotal]}>
          <AppText variant="sectionTitle">Total</AppText>
          <AppText variant="numberLarge" style={{ color: colors.primary }}>
            {formatCurrency(total)}
          </AppText>
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title="Complete Transaction"
          onPress={handleComplete}
          loading={loading}
          disabled={items.length === 0}
          fullWidth
          size="lg"
        />
      </View>
    </AppScreen>
  );
}

function PaymentOption({ icon, label, selected, onPress }: {
  icon: React.ReactNode; label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.paymentOption, selected && styles.paymentSelected]}
      onPress={onPress}
    >
      {icon}
      <AppText
        variant="caption"
        style={selected ? { ...styles.paymentLabel, color: colors.textInverse } : styles.paymentLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingTop: spacing.base,
    marginBottom: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
  },
  itemSubtotal: {
    marginRight: spacing.md,
    minWidth: 70,
    textAlign: 'right',
  },
  section: {
    marginTop: spacing.base,
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentLabel: {
    fontWeight: '600',
  },
  totalCard: {
    marginTop: spacing.base,
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
