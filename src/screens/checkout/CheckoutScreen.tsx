import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ShoppingCart, Search, Package } from 'lucide-react-native';
import { AppScreen, AppText, AppInput, AppEmptyState } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { useCartStore } from '../../stores/cartStore';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

const ALL_CATEGORY = 'Semua';

const ProductTile = React.memo(({ item, qty, onPress }: { item: Product; qty: number; onPress: () => void }) => (
  <Pressable
    style={({ pressed }) => [styles.productCard, pressed && styles.productPressed]}
    onPress={onPress}
  >
    <View style={styles.productIconWrap}>
      <Package size={18} color={colors.primary} />
    </View>
    <View style={styles.productInfo}>
      <AppText variant="bodyMedium" numberOfLines={1}>{item.name}</AppText>
      <AppText variant="caption" style={{ color: colors.primary }}>
        {formatCurrency(item.price)}
      </AppText>
    </View>
    <View style={styles.productStock}>
      <AppText variant="captionMuted">Stok: {item.stock}</AppText>
    </View>
    {qty > 0 && (
      <View style={styles.qtyBadge}>
        <AppText variant="caption" style={styles.qtyText}>{qty}</AppText>
      </View>
    )}
  </Pressable>
));

export function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const { items, addItem, getItemCount, getTotal } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  const loadProducts = useCallback(async () => {
    const data = await productRepository.getActive();
    setAllProducts(data);
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

  const cartMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.product.local_id, i.quantity));
    return m;
  }, [items]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductTile
      item={item}
      qty={cartMap.get(item.local_id) ?? 0}
      onPress={() => addItem(item)}
    />
  ), [cartMap, addItem]);

  return (
    <View style={styles.container}>
      <AppScreen scroll={false} padded={false}>
        <View style={styles.searchBar}>
          <AppInput
            placeholder="Cari produk..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={18} color={colors.textMuted} />}
            containerStyle={styles.searchInput}
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
          renderItem={renderProduct}
          keyExtractor={(item) => item.local_id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={16}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <AppEmptyState
              icon={<Package size={40} color={colors.textMuted} />}
              title="Belum Ada Produk"
              message={searchQuery || selectedCategory !== ALL_CATEGORY
                ? 'Tidak ada produk yang cocok dengan filter'
                : 'Tambahkan produk terlebih dahulu'}
            />
          }
        />
      </AppScreen>

      {itemCount > 0 && (
        <Pressable
          style={styles.cartBar}
          onPress={() => navigation.navigate('CartReview')}
        >
          <View style={styles.cartLeft}>
            <ShoppingCart size={20} color={colors.textInverse} />
            <View style={styles.cartCount}>
              <AppText variant="caption" style={styles.cartCountText}>{itemCount}</AppText>
            </View>
          </View>
          <AppText variant="bodySemibold" style={styles.cartTotal}>
            {formatCurrency(total)}
          </AppText>
          <AppText variant="bodyMedium" style={styles.cartAction}>Lihat Keranjang</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  searchInput: {
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
  gridContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 100,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    position: 'relative',
    ...shadows.sm,
  },
  productPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  productIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  productInfo: {
    marginBottom: spacing.xs,
  },
  productStock: {
    marginTop: spacing.xs,
  },
  qtyBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.lg,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCount: {
    backgroundColor: colors.textInverse,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  cartCountText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  cartTotal: {
    flex: 1,
    color: colors.textInverse,
    textAlign: 'center',
  },
  cartAction: {
    color: colors.textInverse,
  },
});
