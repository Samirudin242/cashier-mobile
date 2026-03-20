import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, Search, Package } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppEmptyState, SyncBadge, AppButton } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

export function ProductsScreen() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = searchQuery
        ? await productRepository.search(searchQuery)
        : await productRepository.getAll();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <AppCard
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { localId: item.local_id })}
    >
      <View style={styles.productRow}>
        <View style={styles.productIcon}>
          <Package size={20} color={colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <AppText variant="bodyMedium" numberOfLines={1}>{item.name}</AppText>
          <View style={styles.productMeta}>
            <AppText variant="captionMuted">SKU: {item.sku}</AppText>
            <AppText variant="captionMuted"> · Stok: {item.stock}</AppText>
          </View>
        </View>
        <View style={styles.productRight}>
          <AppText variant="bodySemibold" style={{ color: colors.primary }}>
            {formatCurrency(item.price)}
          </AppText>
          <SyncBadge status={item.sync_status} style={styles.badge} />
        </View>
      </View>
    </AppCard>
  );

  return (
    <AppScreen scroll={false} padded={false}>
      <View style={styles.searchBar}>
        <AppInput
          placeholder="Cari produk..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          containerStyle={styles.searchInput}
        />
        <AppButton
          title="Tambah"
          onPress={() => navigation.navigate('ProductForm')}
          icon={<Plus size={16} color={colors.textInverse} />}
          size="md"
        />
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.local_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <AppEmptyState
              icon={<Package size={48} color={colors.textMuted} />}
              title="Belum Ada Produk"
              message="Tambahkan produk pertama Anda untuk memulai"
              actionLabel="Tambah Produk"
              onAction={() => navigation.navigate('ProductForm')}
            />
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  productCard: {
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  productRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  badge: {
    marginTop: spacing.xs,
  },
});
