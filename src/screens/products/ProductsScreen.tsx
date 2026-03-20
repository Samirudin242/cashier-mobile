import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, Search, Package, Settings2, X, PlusCircle } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppEmptyState, SyncBadge, AppButton, AppModal } from '../../components/ui';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, radius, shadows } from '../../config/theme';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [products, cats] = await Promise.all([
        productRepository.getAll(),
        categoryRepository.getAll(),
      ]);
      setAllProducts(products);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
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

  const handlePress = useCallback((localId: string) => {
    navigation.navigate('ProductDetail', { localId });
  }, [navigation]);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const exists = await categoryRepository.exists(name);
    if (exists) {
      Alert.alert('Kesalahan', 'Kategori sudah ada');
      return;
    }
    await categoryRepository.create(name);
    setNewCategoryName('');
    const cats = await categoryRepository.getAll();
    setCategories(cats);
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('Hapus Kategori', `Hapus "${cat.name}"? Produk tidak akan terhapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await categoryRepository.remove(cat.id);
          if (selectedCategory === cat.name) setSelectedCategory(ALL_CATEGORY);
          const cats = await categoryRepository.getAll();
          setCategories(cats);
        },
      },
    ]);
  };

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
          <Pressable style={styles.chipManage} onPress={() => setShowCategoryManager(true)}>
            <Settings2 size={14} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
      </View>

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

      {/* Category Manager Modal */}
      <AppModal
        visible={showCategoryManager}
        title="Kelola Kategori"
        onClose={() => setShowCategoryManager(false)}
        primaryAction={{ label: 'Selesai', onPress: () => setShowCategoryManager(false) }}
      >
        <View style={styles.modalAddRow}>
          <TextInput
            style={styles.modalInput}
            placeholder="Nama kategori baru..."
            placeholderTextColor={colors.textMuted}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={handleAddCategory}
            returnKeyType="done"
          />
          <Pressable style={styles.modalAddBtn} onPress={handleAddCategory}>
            <PlusCircle size={24} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.modalCategoryList}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.modalCategoryItem}>
              <AppText variant="body" style={styles.modalCategoryName}>{cat.name}</AppText>
              <Pressable onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                <X size={16} color={colors.error} />
              </Pressable>
            </View>
          ))}
          {categories.length === 0 && (
            <AppText variant="captionMuted" style={styles.modalEmpty}>Belum ada kategori</AppText>
          )}
        </View>
      </AppModal>
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
  chipManage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  modalInput: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalAddBtn: {
    padding: spacing.xs,
  },
  modalCategoryList: {
    gap: spacing.xs,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalCategoryName: {
    flex: 1,
  },
  modalEmpty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
