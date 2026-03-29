import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Coins,
  Package,
  FileDown,
} from 'lucide-react-native';
import { AppScreen, AppText, AppCard, AppStatCard, AppSectionHeader, AppButton, AppInput } from '../../components/ui';
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

const RINCIAN_HARI_TERAKHIR = 30;

function thisMonthDateRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = formatLocalDateString(new Date(y, m, 1));
  const lastDay = new Date(y, m + 1, 0).getDate();
  const last = formatLocalDateString(new Date(y, m, lastDay));
  const today = todayDateString();
  return { start: first, end: today < last ? today : last };
}

export function ReportsScreen() {
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });
  const [productCount, setProductCount] = useState(0);
  const [dailySummary, setDailySummary] = useState<{ date: string; total: number; count: number }[]>([]);
  const [dailyEconomics, setDailyEconomics] = useState<
    { date: string; profit: number; capitalSold: number; handlingTotal: number }[]
  >([]);
  const [todayEconomics, setTodayEconomics] = useState({
    profit: 0,
    capitalSold: 0,
    handlingTotal: 0,
  });
  const [pdfStart, setPdfStart] = useState(() => todayDateString());
  const [pdfEnd, setPdfEnd] = useState(() => todayDateString());
  const [pdfLoading, setPdfLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [today, pCount, daily, econDaily, econToday] = await Promise.all([
          transactionRepository.getTodayTotal(),
          productRepository.getCount(),
          transactionRepository.getDailySummary(RINCIAN_HARI_TERAKHIR),
          transactionRepository.getDailyItemsEconomics(RINCIAN_HARI_TERAKHIR),
          transactionRepository.getTodayItemsEconomics(),
        ]);
        setTodayStats(today);
        setProductCount(pCount);
        setDailySummary(daily);
        setDailyEconomics(econDaily);
        setTodayEconomics(econToday);
      })();
    }, [])
  );

  const econByDate = Object.fromEntries(dailyEconomics.map((e) => [e.date, e]));

  const onPdfToday = () => {
    const t = todayDateString();
    setPdfStart(t);
    setPdfEnd(t);
  };

  const onPdfThisMonth = () => {
    const { start, end } = thisMonthDateRange();
    setPdfStart(start);
    setPdfEnd(end);
  };

  const onDownloadPdf = async () => {
    const startRaw = pdfStart.trim();
    const endRaw = pdfEnd.trim();
    const startD = parseLocalDateString(startRaw);
    const endD = parseLocalDateString(endRaw);
    if (!startD || !endD) {
      Alert.alert('Tanggal tidak valid', 'Gunakan format YYYY-MM-DD (contoh: 2026-03-28).');
      return;
    }
    const start = formatLocalDateString(startD);
    const end = formatLocalDateString(endD);
    const err = validateReportDateRange(start, end);
    if (err) {
      Alert.alert('Rentang tidak diizinkan', err);
      return;
    }
    setPdfLoading(true);
    try {
      await generateAndShareReportPdf(start, end);
    } catch (e: any) {
      Alert.alert('Gagal membuat PDF', e?.message ?? String(e));
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AppScreen scroll>
      <AppText variant="title" style={styles.pageTitle}>Laporan</AppText>

      <View style={styles.statsRow}>
        <AppStatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(todayStats.total)}
          subtitle={`${todayStats.count} transaksi`}
          icon={<DollarSign size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Total Produk"
          value={String(productCount)}
          subtitle="Produk aktif"
          icon={<ShoppingCart size={16} color={colors.primary} />}
          accentColor={colors.primary}
        />
      </View>

      <AppSectionHeader title="Laba & biaya (hari ini)" />
      <View style={styles.statsRow}>
        <AppStatCard
          title="Laba (jual − modal)"
          value={formatCurrency(todayEconomics.profit)}
          subtitle="Dari semua item terjual"
          icon={<TrendingUp size={16} color={colors.success} />}
          accentColor={colors.success}
        />
        <View style={{ width: spacing.md }} />
        <AppStatCard
          title="Total modal terjual"
          value={formatCurrency(todayEconomics.capitalSold)}
          subtitle="Harga pokok × qty"
          icon={<Coins size={16} color={colors.warning} />}
          accentColor={colors.warning}
        />
      </View>
      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <AppStatCard
          title="Biaya penanganan"
          value={formatCurrency(todayEconomics.handlingTotal)}
          subtitle="Σ biaya × qty (hari ini)"
          icon={<Package size={16} color={colors.primaryDark} />}
          accentColor={colors.primaryDark}
        />
        <View style={{ width: spacing.md }} />
        <View style={{ flex: 1 }} />
      </View>

      <AppSectionHeader title="Unduh PDF" />
      <AppCard style={styles.pdfCard}>
        <AppText variant="captionMuted" style={styles.pdfHint}>
          Pilih rentang tanggal (maksimal 31 hari). PDF berisi ringkasan periode dan rincian per hari — cocok untuk laporan harian (1 hari) atau bulanan (satu bulan penuh).
        </AppText>
        <View style={styles.presetRow}>
          <AppButton title="Hari ini" variant="outline" size="sm" onPress={onPdfToday} />
          <View style={{ width: spacing.sm }} />
          <AppButton title="Bulan ini" variant="outline" size="sm" onPress={onPdfThisMonth} />
        </View>
        <AppInput
          label="Tanggal mulai (YYYY-MM-DD)"
          value={pdfStart}
          onChangeText={setPdfStart}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppInput
          label="Tanggal akhir (YYYY-MM-DD)"
          value={pdfEnd}
          onChangeText={setPdfEnd}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppButton
          title="Unduh & bagikan PDF"
          onPress={onDownloadPdf}
          loading={pdfLoading}
          disabled={pdfLoading}
          icon={<FileDown size={18} color={colors.textInverse} />}
          fullWidth
        />
      </AppCard>

      <AppSectionHeader title={`Rincian harian (${RINCIAN_HARI_TERAKHIR} hari terakhir)`} />
      {dailySummary.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText variant="captionMuted" style={{ textAlign: 'center' }}>
            Belum ada data transaksi
          </AppText>
        </AppCard>
      ) : (
        dailySummary.map((day) => {
          const e = econByDate[day.date] ?? {
            profit: 0,
            capitalSold: 0,
            handlingTotal: 0,
          };
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
                <AppText variant="bodySemibold" style={{ color: colors.primary }}>
                  {formatCurrency(day.total)}
                </AppText>
              </View>
              <View style={styles.econRow}>
                <AppText variant="caption" style={styles.econLine}>
                  Laba: {formatCurrency(e.profit)} · Modal: {formatCurrency(e.capitalSold)} · Penanganan:{' '}
                  {formatCurrency(e.handlingTotal)}
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

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
  },
  pdfCard: {
    paddingBottom: spacing.sm,
  },
  pdfHint: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
