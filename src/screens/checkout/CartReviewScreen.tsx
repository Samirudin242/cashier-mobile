import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Minus, Plus, Trash2, CreditCard, Banknote, QrCode, ChevronDown, Check, UserCheck } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppButton } from '../../components/ui';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { transactionRepository } from '../../repositories/transactionRepository';
import { userRepository } from '../../repositories/userRepository';
import { formatCurrency } from '../../utils/helpers';
import { CartItem, User } from '../../types';
import { colors, spacing, radius } from '../../config/theme';

export function CartReviewScreen() {
  const navigation = useNavigation<any>();
  const {
    items, customerName, customerWhatsapp, paymentMethod, discount, notes,
    handlerEmployeeId, handlerEmployeeName,
    updateQuantity, removeItem, setCustomerName, setCustomerWhatsapp,
    setPaymentMethod, setDiscount, setNotes, setHandlerEmployee, getSubtotal, getTotal, clear,
  } = useCartStore();
  const { user, deviceId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  useEffect(() => {
    userRepository.getEmployees().then((emps) => {
      setEmployees(emps);
      if (!handlerEmployeeId && emps.length > 0) {
        setHandlerEmployee(emps[0].id, emps[0].name);
      }
    });
  }, []);

  const subtotal = getSubtotal();
  const total = getTotal();

  const handleComplete = async () => {
    if (items.length === 0) return;
    if (!handlerEmployeeId) {
      Alert.alert('Validasi', 'Pilih karyawan yang menangani pelanggan');
      return;
    }
    setLoading(true);
    try {
      const txn = await transactionRepository.create({
        items,
        customer_name: customerName || undefined,
        customer_whatsapp: customerWhatsapp || undefined,
        employee_id: handlerEmployeeId,
        employee_name: handlerEmployeeName,
        discount,
        payment_method: paymentMethod,
        notes: notes || undefined,
        device_id: deviceId,
      });
      const savedWhatsapp = customerWhatsapp.trim();
      clear();
      navigation.replace('TransactionSuccess', {
        transactionId: txn.local_id,
        total: txn.total,
        transactionNumber: txn.transaction_number,
        customerWhatsapp: savedWhatsapp,
      });
    } catch (err: any) {
      Alert.alert('Kesalahan', err.message);
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
      <AppText variant="title" style={styles.title}>Ringkasan Keranjang</AppText>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.product.local_id}
        scrollEnabled={false}
      />

      <AppCard style={styles.section}>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>Karyawan Penanganan</AppText>
        <View style={styles.fieldGroup}>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowEmployeePicker(!showEmployeePicker)}
          >
            <View style={styles.dropdownLeft}>
              <UserCheck size={16} color={handlerEmployeeId ? colors.primary : colors.textMuted} />
              <AppText
                variant="body"
                style={handlerEmployeeName ? styles.dropdownText : styles.dropdownPlaceholder}
              >
                {handlerEmployeeName || 'Pilih karyawan...'}
              </AppText>
            </View>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>

          {showEmployeePicker && (
            <View style={styles.pickerList}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {employees.map((emp) => {
                  const selected = handlerEmployeeId === emp.id;
                  return (
                    <Pressable
                      key={emp.id}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      onPress={() => {
                        setHandlerEmployee(emp.id, emp.name);
                        setShowEmployeePicker(false);
                      }}
                    >
                      <View>
                        <AppText variant="body" style={selected ? styles.pickerTextSelected : undefined}>
                          {emp.name}
                        </AppText>
                        <AppText variant="captionMuted">Bonus: {emp.bonus_percent}%</AppText>
                      </View>
                      {selected && <Check size={16} color={colors.primary} />}
                    </Pressable>
                  );
                })}
                {employees.length === 0 && (
                  <AppText variant="captionMuted" style={styles.pickerEmpty}>
                    Belum ada karyawan terdaftar
                  </AppText>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>Info Pelanggan</AppText>
        <AppInput
          label="Nama Pelanggan"
          placeholder="Opsional"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <AppInput
          label="Nomor WhatsApp"
          placeholder="cth. 08123456789"
          value={customerWhatsapp}
          onChangeText={setCustomerWhatsapp}
          keyboardType="phone-pad"
        />
      </AppCard>

      <AppCard style={styles.section}>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>Pembayaran</AppText>
        <View style={styles.paymentRow}>
          <PaymentOption
            icon={<Banknote size={18} color={paymentMethod === 'cash' ? colors.textInverse : colors.text} />}
            label="Tunai"
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
          label="Diskon"
          placeholder="0"
          value={discount ? String(discount) : ''}
          onChangeText={(v) => setDiscount(parseFloat(v) || 0)}
          keyboardType="numeric"
        />
        <AppInput
          label="Catatan"
          placeholder="Catatan opsional"
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
            <AppText variant="body">Diskon</AppText>
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
          title="Selesaikan Transaksi"
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
  fieldGroup: {
    marginBottom: spacing.xs,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownText: {
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
  },
  pickerList: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  pickerTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  pickerEmpty: {
    padding: spacing.lg,
    textAlign: 'center',
  },
});
