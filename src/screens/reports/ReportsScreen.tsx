import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Coins,
  Package,
  FileDown,
  Receipt,
} from 'lucide-react-native';
import {
  AppScreen,
  AppText,
  AppCard,
  AppStatCard,
  AppSectionHeader,
  AppButton,
  AppInput,
} from '../../components/ui';
import { transactionRepository } from '../../repositories/transactionRepository';
import { productRepository } from '../../repositories/productRepository';
import {
  formatCurrency,
  formatDate,
  todayDateString,
  formatLocalDateString,
  parseLocalDateString,
} from '../../utils/helpers';
import { generateAndShareReportPdf, validateReportDateRange } from '../../services/reportPdfService';
import { colors, spacing, radius } from '../../config/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Preset = 'today' | 'yesterday' | 'custom';

type Summary = {
  totalTransaksi: number;
  totalPendapatan: number;
  totalModal: number;
  totalLaba: number;
  totalBiayaPenanganan: number;
};

const EMPTY_SUMMARY: Summary = {
  totalTransaksi: 0,
  totalPendapatan: 0,
  totalModal: 0,
  totalLaba: 0,
  totalBiayaPenanganan: 0,
};

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Hari ini' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: 'custom', label: 'Pilih tanggal' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPresetDate(preset: Preset): string {
  const now = new Date();
  if (preset === 'yesterday') {
    return formatLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  }
  return formatLocalDateString(now);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ReportsScreen() {
  const [preset, setPreset] = useState<Preset>('today');
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [customInput, setCustomInput] = useState(todayDateString());

  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [dailySummary, setDailySummary] = useState<{ date: string; total: number; count: number }[]>([]);
  const [dailyEconomics, setDailyEconomics] = useState<
    { date: string; profit: number; capitalSold: number; handlingTotal: number }[]
  >([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [sum, daily, econ, pCount] = await Promise.all([
        transactionRepository.getTransactionSummary(start, end),
        transactionRepository.getDailySummaryDateRange(start, end),
        transactionRepository.getDailyItemsEconomicsDateRange(start, end),
        productRepository.getCount(),
      ]);
      setSummary(sum);
      setDailySummary(daily);
      setDailyEconomics(econ);
      setProductCount(pCount);
    } catch (err: any) {
      Alert.alert('Gagal memuat data', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(selectedDate, selectedDate);
    }, [loadData, selectedDate])
  );

  const selectPreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const date = getPresetDate(p);
      setSelectedDate(date);
      setCustomInput(date);
      loadData(date, date);
    }
  };

  const applyCustomDate = () => {
    const parsed = parseLocalDateString(customInput.trim());
    if (!parsed) {
      Alert.alert('Format tidak valid', 'Gunakan format YYYY-MM-DD (contoh: 2026-05-01)');
      return;
    }
    const date = formatLocalDateString(parsed);
    setSelectedDate(date);
    loadData(date, date);
  };

  const onDownloadPdf = async () => {
    const err = validateReportDateRange(selectedDate, selectedDate);
    if (err) {
      Alert.alert('Rentang tidak diizinkan', err);
      return;
    }
    setPdfLoading(true);
    try {
      await generateAndShareReportPdf(selectedDate, selectedDate);
    } catch (e: any) {
      Alert.alert('Gagal membuat PDF', e?.message ?? String(e));
    } finally {
      setPdfLoading(false);
    }
  };

  const econByDate = Object.fromEntries(dailyEconomics.map((e) => [e.date, e]));
  const label = formatDate(selectedDate);

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Laporan</AppText>

      {/* ── Date selector ── */}
      <AppCard style={styles.dateCard}>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.chip, preset === p.id && styles.chipActive]}
              onPress={() => selectPreset(p.id)}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, preset === p.id && styles.chipTextActive]}
              >
                {p.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {preset === 'custom' && (
          <View style={styles.customSection}>
            <AppInput
              label="Tanggal (YYYY-MM-DD)"
              value={customInput}
              onChangeText={setCustomInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="2026-05-01"
            />
            <AppButton title="Terapkan" onPress={applyCustomDate} size="sm" fullWidth />
          </View>
        )}

        <View style={styles.periodRow}>
          <Calendar size={13} color={colors.textMuted} />
          <AppText variant="captionMuted" style={styles.periodText}>{label}</AppText>
          {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
        </View>
      </AppCard>

      {/* ── Summary stats ── */}
      <AppSectionHeader title="Ringkasan" />

      <View style={styles.statsRow}>
        <AppStatCard
          title="Total Transaksi"
          value={String(summary.totalTransaksi)}
          subtitle={label}
          icon={<Receipt size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Produk Aktif"
          value={String(productCount)}
          subtitle="Total produk"
          icon={<Package size={16} color={colors.textSecondary} />}
          accentColor={colors.textSecondary}
        />
      </View>

      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <AppStatCard
          title="Total Pendapatan"
          value={formatCurrency(summary.totalPendapatan)}
          subtitle="Harga jual × qty"
          icon={<DollarSign size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Total Modal (HPP)"
          value={formatCurrency(summary.totalModal)}
          subtitle="Harga pokok × qty"
          icon={<Coins size={16} color={colors.warning} />}
          accentColor={colors.warning}
        />
      </View>

      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <AppStatCard
          title="Total Laba"
          value={formatCurrency(summary.totalLaba)}
          subtitle="Pendapatan − modal"
          icon={<TrendingUp size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Biaya Penanganan"
          value={formatCurrency(summary.totalBiayaPenanganan)}
          subtitle="Σ biaya × qty"
          icon={<ShoppingCart size={16} color={colors.primaryDark} />}
          accentColor={colors.primaryDark}
        />
      </View>

      {/* ── PDF export ── */}
      <AppSectionHeader title="Unduh PDF" />
      <AppCard style={styles.pdfCard}>
        <AppText variant="captionMuted" style={styles.pdfHint}>
          PDF menggunakan periode yang dipilih di atas (maks. 31 hari). Berisi ringkasan dan rincian harian.
        </AppText>
        <AppButton
          title="Unduh & bagikan PDF"
          onPress={onDownloadPdf}
          loading={pdfLoading}
          disabled={pdfLoading || loading}
          icon={<FileDown size={18} color={colors.textInverse} />}
          fullWidth
        />
      </AppCard>

      {/* ── Daily breakdown ── */}
      <AppSectionHeader title="Rincian Harian" />
      {dailySummary.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText variant="captionMuted" style={styles.emptyText}>
            Tidak ada transaksi pada periode ini
          </AppText>
        </AppCard>
      ) : (
        dailySummary.map((day) => {
          const e = econByDate[day.date] ?? { profit: 0, capitalSold: 0, handlingTotal: 0 };
          return (
            <AppCard key={day.date} style={styles.dayCard}>
              <View style={styles.dayRow}>
                <View style={styles.dayIconWrap}>
                  <Calendar size={16} color={colors.primary} />
                </View>
                <View style={styles.dayInfo}>
                  <AppText variant="bodyMedium">{formatDate(day.date)}</AppText>
                  <AppText variant="captionMuted">{day.count} transaksi</AppText>
                </View>
                <AppText variant="bodySemibold" style={styles.dayTotal}>
                  {formatCurrency(day.total)}
                </AppText>
              </View>
              <View style={styles.econRow}>
                <AppText variant="caption" style={styles.econLine}>
                  Laba: {formatCurrency(e.profit)} · Modal: {formatCurrency(e.capitalSold)} · Penanganan: {formatCurrency(e.handlingTotal)}
                </AppText>
              </View>
            </AppCard>
          );
        })
      )}

      <View style={{ height: spacing.xxl }} />
    </AppScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },

  // Date selector card
  dateCard: {
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  customSection: {
    marginBottom: spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  periodText: {
    flex: 1,
  },
  spinner: {
    marginLeft: spacing.xs,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },

  // PDF
  pdfCard: {
    paddingBottom: spacing.sm,
  },
  pdfHint: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },

  // Daily breakdown
  emptyCard: {
    padding: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dayInfo: {
    flex: 1,
  },
  dayTotal: {
    color: colors.primary,
  },
  econRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  econLine: {
    color: colors.textSecondary,
    flexWrap: 'wrap',
  },
});
