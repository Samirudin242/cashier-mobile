import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Search, Package, ChevronRight, Minus, Plus } from 'lucide-react-native';
import { AppScreen, AppText, AppInput, AppEmptyState } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { useCartStore } from '../../stores/cartStore';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

const ALL_CATEGORY = 'Semua';

/** Min height of cart row (icon + text) inside the pill */
const CART_BAR_ROW_MIN_HEIGHT = 44;
/** Total stacked height of the cart pill (paddingVertical × 2 + row). Bottom offset for system nav is separate. */
const CART_BAR_TOTAL_HEIGHT =
  spacing.sm * 2 + CART_BAR_ROW_MIN_HEIGHT + 4;

const ProductTile = React.memo(
  ({
    item,
    qty,
    onIncrement,
    onDecrement,
  }: {
    item: Product;
    qty: number;
    onIncrement: () => void;
    onDecrement: () => void;
  }) => (
    <View style={styles.productCard}>
      <Pressable
        style={({ pressed }) => [styles.productMain, pressed && styles.productPressed]}
        onPress={onIncrement}
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
      </Pressable>
      {qty > 0 && (
        <View style={styles.qtyStepper}>
          <Pressable
            style={({ pressed }) => [styles.qtyStepBtn, pressed && styles.qtyStepBtnPressed]}
            onPress={onDecrement}
            hitSlop={6}
            accessibilityLabel="Kurangi jumlah"
          >
            <Minus size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
          <AppText variant="bodySemibold" style={styles.qtyStepValue}>
            {qty}
          </AppText>
          <Pressable
            style={({ pressed }) => [styles.qtyStepBtn, pressed && styles.qtyStepBtnPressed]}
            onPress={onIncrement}
            hitSlop={6}
            accessibilityLabel="Tambah jumlah"
          >
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </View>
  )
);

export function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  /** Lift above Android 3-button / gesture nav when safe inset is missing or too small on OEM skins. */
  const cartBottomInset =
    Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom;
  const navigation = useNavigation<any>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const { items, addItem, updateQuantity, removeItem, getItemCount, getTotal } = useCartStore();
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

  const handleDecrement = useCallback(
    (product: Product) => {
      const q = cartMap.get(product.local_id) ?? 0;
      if (q <= 1) removeItem(product.local_id);
      else updateQuantity(product.local_id, q - 1);
    },
    [cartMap, removeItem, updateQuantity]
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductTile
        item={item}
        qty={cartMap.get(item.local_id) ?? 0}
        onIncrement={() => addItem(item)}
        onDecrement={() => handleDecrement(item)}
      />
    ),
    [cartMap, addItem, handleDecrement]
  );

  const listBottomPad = useMemo(() => {
    if (itemCount > 0) {
      return CART_BAR_TOTAL_HEIGHT + spacing.base + cartBottomInset;
    }
    return spacing.xxxl;
  }, [itemCount, cartBottomInset]);

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
          style={[styles.cartBar, { bottom: cartBottomInset, left: spacing.base, right: spacing.base }]}
          onPress={() => navigation.navigate('CartReview')}
        >
          <View style={styles.cartBarRow}>
            <View style={styles.cartBarLeading}>
              <View style={styles.cartIconGroup}>
                <ShoppingCart size={20} color={colors.textInverse} />
                <View style={styles.cartCount}>
                  <AppText variant="caption" style={styles.cartCountText}>{itemCount}</AppText>
                </View>
              </View>
              <AppText
                variant="bodySemibold"
                style={styles.cartTotal}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatCurrency(total)}
              </AppText>
            </View>
            <View style={styles.cartBarTrailing}>
              <AppText variant="bodyMedium" style={styles.cartAction} numberOfLines={1}>
                Lihat Keranjang
              </AppText>
              <ChevronRight size={20} color={colors.textInverse} strokeWidth={2.5} />
            </View>
          </View>
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
    ...shadows.sm,
  },
  productMain: {
    flexGrow: 1,
  },
  productPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  qtyStepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepBtnPressed: {
    opacity: 0.75,
  },
  qtyStepValue: {
    fontSize: 16,
    color: colors.text,
    minWidth: 28,
    textAlign: 'center',
  },
  cartBar: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  cartBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: CART_BAR_ROW_MIN_HEIGHT,
  },
  cartBarLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  cartIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  cartBarTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
    paddingLeft: spacing.xs,
  },
  cartCount: {
    backgroundColor: colors.textInverse,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  cartCountText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  cartTotal: {
    flex: 1,
    marginLeft: spacing.md,
    color: colors.textInverse,
    fontSize: 16,
  },
  cartAction: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
});
