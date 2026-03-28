import * as Crypto from 'expo-crypto';

export function generateLocalId(): string {
  return Crypto.randomUUID();
}

export function generateTransactionNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TXN-${y}${m}${d}-${h}${min}${s}-${rand}`;
}

export function formatCurrency(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Inclusive start and exclusive end of the calendar day in local time, as ISO strings (for SQL comparisons on UTC timestamps). */
export function getLocalDayRangeISO(date: Date): { startISO: string; endISO: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d + 1, 0, 0, 0, 0);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addLocalCalendarDays(date: Date, deltaDays: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

/**
 * Normalizes Indonesian phone input to WhatsApp international format (62xxxxxxxxxxx).
 * Accepts e.g. 082347497133, +62 823-4749-7133, 6282347497133
 */
export function normalizeIndonesianPhoneForWhatsApp(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  let n = digits;
  if (n.startsWith('62')) {
    // already 62...
  } else if (n.startsWith('0')) {
    n = '62' + n.slice(1);
  } else if (n.startsWith('8') && n.length >= 9 && n.length <= 12) {
    // 8xx... without leading 0
    n = '62' + n;
  } else {
    return null;
  }

  // Indonesian mobile after 62: typically 9–12 digits (62 + 8–11 digit national number)
  if (n.length < 11 || n.length > 15) return null;
  if (!n.startsWith('62')) return null;

  return n;
}
