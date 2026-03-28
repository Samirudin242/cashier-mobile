/**
 * Appends rows to Google Sheets through an HTTPS endpoint (recommended: Google Apps Script Web App).
 *
 * Expected POST body (JSON): { secret?: string, rows: string[][] }
 * Each inner array is one sheet row. Columns: A name, B whatsapp.
 * C/D: for transaksi — nomor transaksi & item; for pelanggan — email & total_spent (angka).
 *
 * Example Apps Script (deploy as Web app, execute as you, access: anyone):
 *
 *   function doPost(e) {
 *     const body = JSON.parse(e.postData.contents);
 *     const SECRET = 'your-shared-secret'; // match EXPO_PUBLIC_GOOGLE_SHEETS_SECRET or leave unused
 *     if (SECRET && body.secret !== SECRET) return ContentService.createTextOutput('denied');
 *     const sh = SpreadsheetApp ... // getActiveSpreadsheet().getSheetByName('Customer data')
 *     (body.rows || []).forEach(function (r) { sh.appendRow(r); });
 *     return ContentService.createTextOutput('ok');
 *   }
 */

import { getGoogleSheetsSecret, getGoogleSheetsWebhookUrl } from '../config/googleSheets';

export type SheetRow = [string, string, string, string];

export async function appendRowsToGoogleSheet(rows: SheetRow[]): Promise<void> {
  if (rows.length === 0) return;

  const url = getGoogleSheetsWebhookUrl();
  if (!url) return;

  const secret = getGoogleSheetsSecret();
  const body: { secret?: string; rows: string[][] } = { rows };
  if (secret) body.secret = secret;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    const looksLikeHtml =
      raw.includes('<!DOCTYPE') || raw.includes('<html') || raw.includes('Halaman Tidak Ditemukan');

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Google Apps Script mengembalikan HTTP ${res.status}. ` +
          'Buka deployment: Terapkan → Kelola deployment → ikon pensil (edit) pada penerapan Web App Anda. ' +
          'Set "Siapa yang memiliki akses" ke Siapa saja (Anyone), lalu Terapkan. ' +
          'Jika tetap Hanya saya / Only you, aplikasi di HP tidak bisa memanggil webhook tanpa login Google.'
      );
    }

    const urlHint =
      'Salah URL webhook. Pakai URL Aplikasi web dari Terapkan → Kelola penerapan ' +
      '(https://script.google.com/macros/s/.../exec), bukan URL editor.';
    throw new Error(looksLikeHtml ? `${urlHint} (HTTP ${res.status})` : raw || `Google Sheet: HTTP ${res.status}`);
  }
}
