import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { EmployeeSalary } from '../types';
import { formatCurrency } from '../utils/helpers';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function slugify(text: string): string {
  return text.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

function getPdfFilename(salary: EmployeeSalary): string {
  const empName = slugify(salary.employee.name);
  const [year, monthStr] = salary.periodStart.split('-');
  const monthNum = parseInt(monthStr, 10);
  const monthName = MONTH_NAMES[monthNum - 1] ?? monthStr;
  return `Slip-Gaji-${empName}-${monthName}-${year}.pdf`;
}

export async function generateSalaryPdf(salary: EmployeeSalary): Promise<void> {
  const attendanceRows = salary.attendanceDetails
    .map(
      (a, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td>${a.date}</td>
          <td>${statusLabel(a.status)}</td>
          <td>${a.clockIn || '-'}</td>
          <td>${a.clockOut || '-'}</td>
        </tr>`
    )
    .join('');

  const bonusPct = salary.employee.bonus_percent;
  const bonusRows = salary.transactions
    .map((t, i) => {
      const itemRows = (t.items ?? [])
        .map(
          (item) =>
            `<tr style="background:#FAFAFA;">
              <td></td>
              <td colspan="2" style="padding-left:20px;">• ${item.productName} (×${item.quantity})</td>
              <td>${formatCurrency(item.handlingFee)}</td>
              <td></td>
              <td>${formatCurrency(item.bonus)}</td>
            </tr>`
        )
        .join('');
      return (
        `<tr>
          <td>${i + 1}</td>
          <td>${t.date.split('T')[0]}</td>
          <td>${t.transactionNumber ?? '-'}</td>
          <td>${formatCurrency(t.handlingTotal)}</td>
          <td></td>
          <td>${formatCurrency(t.bonus)}</td>
        </tr>` + itemRows
      );
    })
    .join('');

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; padding: 24px; font-size: 12px; color: #333; }
      h1 { font-size: 20px; margin-bottom: 4px; color: #4F46E5; }
      h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #4F46E5; padding-bottom: 4px; }
      .subtitle { color: #888; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
      th { background: #F9FAFB; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #666; }
      .summary-table td { border-bottom: none; padding: 4px 8px; }
      .summary-table .label { color: #666; width: 50%; }
      .summary-table .value { font-weight: 600; text-align: right; }
      .total-row td { border-top: 2px solid #333; font-weight: 700; font-size: 14px; }
      .footer { margin-top: 32px; text-align: center; color: #aaa; font-size: 10px; }
    </style>
  </head>
  <body>
    <h1>Slip Gaji Karyawan</h1>
    <p class="subtitle">Periode: ${salary.periodStart} s/d ${salary.periodEnd}</p>

    <table class="summary-table">
      <tr><td class="label">Nama</td><td class="value">${salary.employee.name}</td></tr>
      <tr><td class="label">Kode Akses</td><td class="value">${salary.employee.access_code}</td></tr>
      <tr><td class="label">Gaji per Hari</td><td class="value">${formatCurrency(salary.employee.daily_salary)}</td></tr>
      <tr><td class="label">Persentase Bonus</td><td class="value">${bonusPct}%</td></tr>
    </table>

    <h2>Ringkasan Gaji</h2>
    <table class="summary-table">
      <tr><td class="label">Hari Kerja (Hadir)</td><td class="value">${salary.daysWorked} hari</td></tr>
      <tr><td class="label">Hari Terlambat</td><td class="value">${salary.daysLate} hari</td></tr>
      <tr><td class="label">Gaji Pokok (${salary.daysWorked} × ${formatCurrency(salary.employee.daily_salary)})</td><td class="value">${formatCurrency(salary.baseSalary)}</td></tr>
      <tr><td class="label">Bonus Penjualan (${bonusPct}%)</td><td class="value">${formatCurrency(salary.bonus)}</td></tr>
      <tr class="total-row"><td class="label">TOTAL GAJI</td><td class="value">${formatCurrency(salary.totalSalary)}</td></tr>
    </table>

    <h2>Detail Absensi</h2>
    <table>
      <thead><tr><th>#</th><th>Tanggal</th><th>Status</th><th>Masuk</th><th>Keluar</th></tr></thead>
      <tbody>${attendanceRows || '<tr><td colspan="5" style="text-align:center;color:#aaa;">Tidak ada data</td></tr>'}</tbody>
    </table>

    <h2>Detail Bonus Penjualan (${bonusPct}%)</h2>
    <p style="color:#666;font-size:11px;margin-bottom:8px;">Rumus per item: Biaya Penanganan × ${bonusPct}% = Bonus. Total bonus = jumlah bonus tiap item.</p>
    <table>
      <thead><tr><th>#</th><th>Tanggal</th><th>Transaksi</th><th>Penanganan</th><th></th><th>Bonus</th></tr></thead>
      <tbody>${bonusRows || '<tr><td colspan="6" style="text-align:center;color:#aaa;">Tidak ada data</td></tr>'}</tbody>
    </table>

    <p class="footer">Dibuat oleh Kasir POS — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </body>
  </html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
  const filename = getPdfFilename(salary);
  const newUri = `${dir}${filename}`;

  await FileSystem.moveAsync({ from: uri, to: newUri });
  await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Slip Gaji' });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { present: 'Hadir', late: 'Terlambat', absent: 'Absen', leave: 'Cuti' };
  return map[status] ?? status;
}
