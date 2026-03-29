import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { transactionRepository } from '../repositories/transactionRepository';
import { countDaysInclusive, enumerateDatesInclusive, parseLocalDateString } from '../utils/helpers';

function formatIdDate(ymd: string): string {
  const d = parseLocalDateString(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MAX_RANGE_DAYS = 31;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function validateReportDateRange(startDate: string, endDate: string): string | null {
  const days = countDaysInclusive(startDate, endDate);
  if (days === 0) return 'Tanggal tidak valid atau tanggal mulai setelah tanggal akhir.';
  if (days > MAX_RANGE_DAYS) return `Rentang maksimal ${MAX_RANGE_DAYS} hari.`;
  return null;
}

export async function generateAndShareReportPdf(startDate: string, endDate: string): Promise<void> {
  const err = validateReportDateRange(startDate, endDate);
  if (err) throw new Error(err);

  const [summary, econ] = await Promise.all([
    transactionRepository.getDailySummaryDateRange(startDate, endDate),
    transactionRepository.getDailyItemsEconomicsDateRange(startDate, endDate),
  ]);

  const bySum = Object.fromEntries(summary.map((s) => [s.date, s]));
  const byEcon = Object.fromEntries(econ.map((e) => [e.date, e]));
  const dates = enumerateDatesInclusive(startDate, endDate);

  const rows = dates.map((date) => {
    const s = bySum[date];
    const e = byEcon[date];
    return {
      date,
      transactionCount: s?.count ?? 0,
      revenue: s?.total ?? 0,
      profit: e?.profit ?? 0,
      capitalSold: e?.capitalSold ?? 0,
      handlingTotal: e?.handlingTotal ?? 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      transactionCount: acc.transactionCount + r.transactionCount,
      revenue: acc.revenue + r.revenue,
      profit: acc.profit + r.profit,
      capitalSold: acc.capitalSold + r.capitalSold,
      handlingTotal: acc.handlingTotal + r.handlingTotal,
    }),
    {
      transactionCount: 0,
      revenue: 0,
      profit: 0,
      capitalSold: 0,
      handlingTotal: 0,
    }
  );

  const fmt = (n: number) => n.toLocaleString('id-ID');
  const dailyTableRows = rows
    .map(
      (r) =>
        `<tr>
          <td>${escapeHtml(formatIdDate(r.date))}</td>
          <td style="text-align:right;">${r.transactionCount}</td>
          <td style="text-align:right;">Rp ${fmt(r.revenue)}</td>
          <td style="text-align:right;">Rp ${fmt(r.profit)}</td>
          <td style="text-align:right;">Rp ${fmt(r.capitalSold)}</td>
          <td style="text-align:right;">Rp ${fmt(r.handlingTotal)}</td>
        </tr>`
    )
    .join('');

  const periodLabel =
    startDate === endDate
      ? `Per hari: ${escapeHtml(formatIdDate(startDate))}`
      : `Periode: ${escapeHtml(formatIdDate(startDate))} — ${escapeHtml(formatIdDate(endDate))}`;

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; padding: 24px; font-size: 12px; color: #333; }
      h1 { font-size: 20px; margin-bottom: 4px; color: #4F46E5; }
      .subtitle { color: #888; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
      th { background: #F9FAFB; font-weight: 600; font-size: 10px; text-transform: uppercase; color: #666; }
      .summary-table td { border-bottom: none; padding: 4px 8px; }
      .summary-table .label { color: #666; width: 50%; }
      .summary-table .value { font-weight: 600; text-align: right; }
      .total-row td { border-top: 2px solid #333; font-weight: 700; font-size: 13px; }
      .footer { margin-top: 32px; text-align: center; color: #aaa; font-size: 10px; }
    </style>
  </head>
  <body>
    <h1>Laporan Penjualan</h1>
    <p class="subtitle">${periodLabel}</p>

    <h2 style="font-size:14px;margin-top:16px;border-bottom:2px solid #4F46E5;padding-bottom:4px;">Ringkasan periode</h2>
    <table class="summary-table">
      <tr><td class="label">Jumlah transaksi</td><td class="value">${totals.transactionCount}</td></tr>
      <tr><td class="label">Total pendapatan</td><td class="value">Rp ${fmt(totals.revenue)}</td></tr>
      <tr><td class="label">Laba (jual − modal)</td><td class="value">Rp ${fmt(totals.profit)}</td></tr>
      <tr><td class="label">Total modal terjual</td><td class="value">Rp ${fmt(totals.capitalSold)}</td></tr>
      <tr><td class="label">Total biaya penanganan</td><td class="value">Rp ${fmt(totals.handlingTotal)}</td></tr>
    </table>

    <h2 style="font-size:14px;margin-top:16px;border-bottom:2px solid #4F46E5;padding-bottom:4px;">Rincian per hari</h2>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th style="text-align:right;">Trx</th>
          <th style="text-align:right;">Pendapatan</th>
          <th style="text-align:right;">Laba</th>
          <th style="text-align:right;">Modal</th>
          <th style="text-align:right;">Penanganan</th>
        </tr>
      </thead>
      <tbody>
        ${dailyTableRows}
        <tr class="total-row">
          <td>Total</td>
          <td style="text-align:right;">${totals.transactionCount}</td>
          <td style="text-align:right;">Rp ${fmt(totals.revenue)}</td>
          <td style="text-align:right;">Rp ${fmt(totals.profit)}</td>
          <td style="text-align:right;">Rp ${fmt(totals.capitalSold)}</td>
          <td style="text-align:right;">Rp ${fmt(totals.handlingTotal)}</td>
        </tr>
      </tbody>
    </table>

    <p class="footer">Dibuat oleh Kasir POS — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </body>
  </html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
  const filename = `Laporan-${startDate}_sd_${endDate}.pdf`;
  const newUri = `${dir}${filename}`;

  await FileSystem.moveAsync({ from: uri, to: newUri });
  await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Laporan PDF' });
}
