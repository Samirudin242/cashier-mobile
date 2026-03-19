import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ShoppingCart, Plus, Minus, Search, Package } from 'lucide-react-native';
import { AppScreen, AppText, AppCard, AppInput, AppButton, AppEmptyState } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { useCartStore } from '../../stores/cartStore';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

export function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { items, addItem, getItemCount, getTotal } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  const loadProducts = useCallback(async () => {
    const data = searchQuery
      ? await productRepository.search(searchQuery)
      : await productRepository.getActive();
    setProducts(data);
  }, [searchQuery]);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const getCartQuantity = (productId: string) => {
    return items.find((i) => i.product.local_id === productId)?.quantity ?? 0;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const qty = getCartQuantity(item.local_id);
    return (
      <Pressable
        style={({ pressed }) => [styles.productCard, pressed && styles.productPressed]}
        onPress={() => addItem(item)}
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
          <AppText variant="captionMuted">Stock: {item.stock}</AppText>
        </View>
        {qty > 0 && (
          <View style={styles.qtyBadge}>
            <AppText variant="caption" style={styles.qtyText}>{qty}</AppText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <AppScreen scroll={false} padded={false}>
        <View style={styles.searchBar}>
          <AppInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={18} color={colors.textMuted} />}
            containerStyle={styles.searchInput}
          />
        </View>

        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.local_id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppEmptyState
              icon={<Package size={40} color={colors.textMuted} />}
              title="No Products"
              message="Add products first to start selling"
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
          <AppText variant="bodyMedium" style={styles.cartAction}>View Cart</AppText>
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
    marginBottom: spacing.sm,
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
