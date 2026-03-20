import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronDown, Check } from 'lucide-react-native';
import { AppScreen, AppCard, AppButton, AppInput, AppText } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { useAuthStore } from '../../stores/authStore';
import { Category } from '../../types';
import { colors, spacing, radius } from '../../config/theme';

export function ProductFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const localId = route.params?.localId;
  const isEdit = !!localId;

  const { user, deviceId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    handling_fee: '',
    stock: '',
    category: '',
  });

  useEffect(() => {
    categoryRepository.getAll().then(setCategories);
  }, []);

  useEffect(() => {
    if (isEdit) {
      productRepository.getById(localId).then((p) => {
        if (p) {
          setForm({
            name: p.name,
            sku: p.sku,
            price: String(p.price),
            cost_price: String(p.cost_price),
            handling_fee: String(p.handling_fee || 0),
            stock: String(p.stock),
            category: p.category,
          });
        }
      });
    }
  }, [isEdit, localId]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Validasi', 'Nama dan harga wajib diisi');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await productRepository.update(
          localId,
          {
            name: form.name.trim(),
            sku: form.sku.trim(),
            price: parseFloat(form.price) || 0,
            cost_price: parseFloat(form.cost_price) || 0,
            handling_fee: parseFloat(form.handling_fee) || 0,
            stock: parseInt(form.stock) || 0,
            category: form.category.trim(),
          },
          user!.id
        );
      } else {
        await productRepository.create({
          name: form.name.trim(),
          sku: form.sku.trim() || `SKU-${Date.now()}`,
          price: parseFloat(form.price) || 0,
          cost_price: parseFloat(form.cost_price) || 0,
          handling_fee: parseFloat(form.handling_fee) || 0,
          stock: parseInt(form.stock) || 0,
          category: form.category.trim() || 'Umum',
          device_id: deviceId,
          user_id: user!.id,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Kesalahan', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.title}>
        {isEdit ? 'Edit Produk' : 'Produk Baru'}
      </AppText>

      <AppCard style={styles.card}>
        <AppInput
          label="Nama Produk"
          placeholder="cth. Nasi Goreng"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
        />
        <AppInput
          label="SKU"
          placeholder="cth. NG-001"
          value={form.sku}
          onChangeText={(v) => setForm({ ...form, sku: v })}
          autoCapitalize="characters"
        />
        <View style={styles.row}>
          <AppInput
            label="Harga Jual"
            placeholder="0"
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <AppInput
            label="Harga Modal"
            placeholder="0"
            value={form.cost_price}
            onChangeText={(v) => setForm({ ...form, cost_price: v })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>

        <AppInput
          label="Biaya Penanganan (Rp)"
          placeholder="0"
          value={form.handling_fee}
          onChangeText={(v) => setForm({ ...form, handling_fee: v })}
          keyboardType="numeric"
        />

        <AppInput
          label="Stok"
          placeholder="0"
          value={form.stock}
          onChangeText={(v) => setForm({ ...form, stock: v })}
          keyboardType="numeric"
        />

        {/* Category Dropdown */}
        <View style={styles.fieldGroup}>
          <AppText variant="caption" style={styles.fieldLabel}>Kategori</AppText>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <AppText
              variant="body"
              style={form.category ? styles.dropdownText : styles.dropdownPlaceholder}
            >
              {form.category || 'Pilih kategori...'}
            </AppText>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>

          {showCategoryPicker && (
            <View style={styles.pickerList}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {categories.map((cat) => {
                  const selected = form.category === cat.name;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      onPress={() => {
                        setForm({ ...form, category: cat.name });
                        setShowCategoryPicker(false);
                      }}
                    >
                      <AppText
                        variant="body"
                        style={selected ? styles.pickerTextSelected : undefined}
                      >
                        {cat.name}
                      </AppText>
                      {selected && <Check size={16} color={colors.primary} />}
                    </Pressable>
                  );
                })}
                {categories.length === 0 && (
                  <AppText variant="captionMuted" style={styles.pickerEmpty}>
                    Belum ada kategori. Tambah di halaman produk.
                  </AppText>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title={isEdit ? 'Perbarui Produk' : 'Simpan Produk'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />
        <AppButton
          title="Batal"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          size="md"
          style={styles.cancelBtn}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontWeight: '500',
    color: colors.textSecondary,
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
  actions: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
