import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Package, Edit, Trash2 } from "lucide-react-native";
import {
  AppScreen,
  AppCard,
  AppText,
  AppButton,
  SyncBadge,
} from "../../components/ui";
import { productRepository } from "../../repositories/productRepository";
import { useAuthStore } from "../../stores/authStore";
import { Product } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/helpers";
import { colors, spacing, radius } from "../../config/theme";

export function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { localId } = route.params;
  const user = useAuthStore((s) => s.user);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    productRepository.getById(localId).then(setProduct);
  }, [localId]);

  const handleDelete = () => {
    Alert.alert(
      "Hapus Produk",
      "Apakah Anda yakin ingin menghapus produk ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await productRepository.softDelete(localId, user!.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!product) return null;

  const showCostAndHandling = user?.role !== "employee";

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Package size={32} color={colors.primary} />
        </View>
        <AppText variant="title">{product.name}</AppText>
        <SyncBadge status={product.sync_status} style={styles.badge} />
      </View>

      <AppCard style={styles.card}>
        <DetailRow label="SKU" value={product.sku} />
        <DetailRow
          label="Harga Jual"
          value={formatCurrency(product.price)}
          highlight
        />
        {showCostAndHandling ? (
          <>
            <DetailRow
              label="Harga Modal"
              value={formatCurrency(product.cost_price)}
            />
            <DetailRow
              label="Biaya penanganan"
              value={formatCurrency(product.handling_fee ?? 0)}
            />
          </>
        ) : null}
        <DetailRow label="Stok" value={String(product.stock)} />
        <DetailRow label="Kategori" value={product.category} />
        <DetailRow
          label="Status"
          value={product.is_active ? "Aktif" : "Nonaktif"}
        />
        <DetailRow
          label="Dibuat"
          value={formatDateTime(product.created_at_local)}
        />
        <DetailRow
          label="Diperbarui"
          value={formatDateTime(product.updated_at_local)}
        />
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title="Edit Produk"
          onPress={() => navigation.navigate("ProductForm", { localId })}
          icon={<Edit size={16} color={colors.textInverse} />}
          fullWidth
          size="lg"
        />
        <AppButton
          title="Hapus Produk"
          onPress={handleDelete}
          variant="danger"
          icon={<Trash2 size={16} color={colors.textInverse} />}
          fullWidth
          size="lg"
          style={styles.deleteBtn}
        />
      </View>
    </AppScreen>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={detailStyles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText
        variant={highlight ? "bodySemibold" : "body"}
        style={highlight ? { color: colors.primary } : undefined}
      >
        {value}
      </AppText>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
});

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  badge: {
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  deleteBtn: {
    marginTop: spacing.sm,
  },
});
