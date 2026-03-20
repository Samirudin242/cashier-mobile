import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, Search, Package } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppEmptyState, SyncBadge, AppButton } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

const ITEM_HEIGHT = 72;

const ProductItem = React.memo(({ item, onPress }: { item: Product; onPress: (id: string) => void }) => (
  <AppCard style={styles.productCard} onPress={() => onPress(item.local_id)}>
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
));

const ALL_CATEGORY = 'Semua';

export function ProductsScreen() {
  const navigation = useNavigation<any>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productRepository.getAll();
      setAllProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category).filter(Boolean));
    return [ALL_CATEGORY, ...Array.from(cats).sort()];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (selectedCategory !== ALL_CATEGORY) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allProducts, selectedCategory, searchQuery]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handlePress = useCallback((localId: string) => {
    navigation.navigate('ProductDetail', { localId });
  }, [navigation]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <AppScreen scroll={false} padded={false}>
      <View style={styles.searchBar}>
        <AppInput
          placeholder="Cari produk..."
          value={searchQuery}
          onChangeText={handleSearch}
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

      {categories.length > 2 && (
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryBar}
          renderItem={({ item: cat }) => (
            <Pressable
              style={[styles.categoryChip, cat === selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <AppText
                variant="caption"
                style={[styles.categoryText, cat === selectedCategory && styles.categoryTextActive]}
              >
                {cat}
              </AppText>
            </Pressable>
          )}
        />
      )}

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductItem item={item} onPress={handlePress} />}
        keyExtractor={(item) => item.local_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          !loading ? (
            <AppEmptyState
              icon={<Package size={48} color={colors.textMuted} />}
              title="Belum Ada Produk"
              message={searchQuery || selectedCategory !== ALL_CATEGORY
                ? 'Tidak ada produk yang cocok dengan filter'
                : 'Tambahkan produk pertama Anda untuk memulai'}
              actionLabel={!searchQuery && selectedCategory === ALL_CATEGORY ? 'Tambah Produk' : undefined}
              onAction={!searchQuery && selectedCategory === ALL_CATEGORY ? () => navigation.navigate('ProductForm') : undefined}
            />
          ) : null
        }
        ListFooterComponent={<View style={{ height: spacing.xxl }} />}
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
  categoryBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
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
