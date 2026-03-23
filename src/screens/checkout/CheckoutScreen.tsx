import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useOptionalBottomTabBarHeight } from '../../hooks/useOptionalBottomTabBarHeight';
import { ShoppingCart, Search, Package } from 'lucide-react-native';
import { AppScreen, AppText, AppInput, AppEmptyState } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { useCartStore } from '../../stores/cartStore';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

const ALL_CATEGORY = 'Semua';

/** Fixed height for the floating cart bar (icon row + padding) */
const CART_BAR_HEIGHT = 56;
/** Tab bar content height (icons + labels) from AppNavigator */
const TAB_BAR_CONTENT_HEIGHT = 58;

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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const { items, addItem, getItemCount, getTotal } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  const loadData = useCallback(async () => {
    const [products, cats] = await Promise.all([
      productRepository.getActive(),
      categoryRepository.getAll(),
    ]);
    setAllProducts(products);
    setCategories(cats);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const categoryNames = useMemo(
    () => [ALL_CATEGORY, ...categories.map((c) => c.name)],
    [categories]
  );

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

  const effectiveTabBarHeight =
    tabBarHeight > 0 ? tabBarHeight : TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 10);

  const listBottomPad = useMemo(() => {
    if (itemCount > 0) {
      return effectiveTabBarHeight + CART_BAR_HEIGHT + spacing.xl + spacing.sm;
    }
    return spacing.xxxl + effectiveTabBarHeight;
  }, [itemCount, effectiveTabBarHeight]);

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

        <View style={styles.categorySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categoryNames.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, cat === selectedCategory && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <AppText style={[styles.chipText, cat === selectedCategory && styles.chipTextActive]}>
                  {cat}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.local_id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: listBottomPad }]}
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
          style={[
            styles.cartBar,
            {
              bottom: effectiveTabBarHeight + spacing.md,
              left: spacing.base,
              right: spacing.base,
            },
          ]}
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
  categorySection: {
    height: 44,
    marginTop: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: spacing.base,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: CART_BAR_HEIGHT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
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
