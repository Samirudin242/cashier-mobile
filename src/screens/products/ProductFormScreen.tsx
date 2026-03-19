import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppScreen, AppCard, AppButton, AppInput, AppText } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types';
import { colors, spacing } from '../../config/theme';

export function ProductFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const localId = route.params?.localId;
  const isEdit = !!localId;

  const { user, deviceId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    stock: '',
    category: '',
  });

  useEffect(() => {
    if (isEdit) {
      productRepository.getById(localId).then((p) => {
        if (p) {
          setForm({
            name: p.name,
            sku: p.sku,
            price: String(p.price),
            cost_price: String(p.cost_price),
            stock: String(p.stock),
            category: p.category,
          });
        }
      });
    }
  }, [isEdit, localId]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Validation', 'Name and price are required');
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
          stock: parseInt(form.stock) || 0,
          category: form.category.trim() || 'General',
          device_id: deviceId,
          user_id: user!.id,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.title}>
        {isEdit ? 'Edit Product' : 'New Product'}
      </AppText>

      <AppCard style={styles.card}>
        <AppInput
          label="Product Name"
          placeholder="e.g. Nasi Goreng"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
        />
        <AppInput
          label="SKU"
          placeholder="e.g. NG-001"
          value={form.sku}
          onChangeText={(v) => setForm({ ...form, sku: v })}
          autoCapitalize="characters"
        />
        <View style={styles.row}>
          <AppInput
            label="Sell Price"
            placeholder="0"
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <AppInput
            label="Cost Price"
            placeholder="0"
            value={form.cost_price}
            onChangeText={(v) => setForm({ ...form, cost_price: v })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>
        <View style={styles.row}>
          <AppInput
            label="Stock"
            placeholder="0"
            value={form.stock}
            onChangeText={(v) => setForm({ ...form, stock: v })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <AppInput
            label="Category"
            placeholder="e.g. Food"
            value={form.category}
            onChangeText={(v) => setForm({ ...form, category: v })}
            containerStyle={styles.halfInput}
          />
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title={isEdit ? 'Update Product' : 'Save Product'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />
        <AppButton
          title="Cancel"
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
  actions: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
