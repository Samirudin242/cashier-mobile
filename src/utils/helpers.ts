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

/** Calendar date in device local timezone (YYYY-MM-DD). Used for attendance `date` so month filters match. */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/** Parse YYYY-MM-DD in local calendar (not UTC). */
export function parseLocalDateString(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const d = +m[3];
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Inclusive list of calendar dates from start through end (YYYY-MM-DD). */
export function enumerateDatesInclusive(startStr: string, endStr: string): string[] {
  const start = parseLocalDateString(startStr);
  const end = parseLocalDateString(endStr);
  if (!start || !end) return [];
  const startT = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endT = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  if (startT > endT) return [];
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cur.getTime() <= endT) {
    out.push(formatLocalDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function countDaysInclusive(startStr: string, endStr: string): number {
  return enumerateDatesInclusive(startStr, endStr).length;
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
