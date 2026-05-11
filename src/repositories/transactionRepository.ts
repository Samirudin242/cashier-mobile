import { getDatabase } from '../database/sqlite/client';
import { supabase } from '../config/supabase';
import { Transaction, TransactionItem, CartItem, SyncStatus } from '../types';
import {
  generateLocalId,
  generateTransactionNumber,
  getLocalDayRangeISO,
  localDateToStartISO,
  localDateToEndISO,
  isoToLocalDateString,
  nowISO,
} from '../utils/helpers';
import { customerRepository } from './customerRepository';

export const transactionRepository = {
  // ─── READ METHODS (Supabase) ──────────────────────────────────────────────

  async getAll(limit = 50, offset = 0): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []).map(mapCloudToTransaction);
  },

  async getForLocalCalendarDay(day: Date, limit = 100): Promise<Transaction[]> {
    const { startISO, endISO } = getLocalDayRangeISO(day);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO)
      .order('transaction_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapCloudToTransaction);
  },

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCloudToTransaction(data) : null;
  },

  /**
   * Fetches transaction items. Tries SQLite first (used by sync service with local UUIDs),
   * then falls back to Supabase (used by detail screen with cloud UUIDs).
   */
  async getItems(transactionId: string): Promise<TransactionItem[]> {
    const db = await getDatabase();
    const localRows = await db.getAllAsync<any>(
      'SELECT * FROM transaction_items WHERE transaction_local_id = ?',
      [transactionId]
    );
    if (localRows.length > 0) return localRows.map(mapRowToItem);
    const { data, error } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transactionId);
    if (error) throw error;
    return (data ?? []).map(mapCloudItemToItem);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const startISO = localDateToStartISO(startDate);
    const endISO = localDateToEndISO(endDate);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapCloudToTransaction);
  },

  async getTodayTotal(): Promise<{ count: number; total: number }> {
    const { startISO, endISO } = getLocalDayRangeISO(new Date());
    const { data, error } = await supabase
      .from('transactions')
      .select('total')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO);
    if (error) throw error;
    const rows = data ?? [];
    return {
      count: rows.length,
      total: rows.reduce((sum, t) => sum + (t.total ?? 0), 0),
    };
  },

  async getDailySummary(days: number = 7): Promise<{ date: string; total: number; count: number }[]> {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startISO = getLocalDayRangeISO(start).startISO;
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, total')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    const map = new Map<string, { total: number; count: number }>();
    for (const row of (data ?? [])) {
      const date = isoToLocalDateString(row.transaction_date);
      const existing = map.get(date) ?? { total: 0, count: 0 };
      map.set(date, { total: existing.total + (row.total ?? 0), count: existing.count + 1 });
    }
    return Array.from(map.entries())
      .map(([date, val]) => ({ date, total: val.total, count: val.count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days);
  },

  async getDailySummaryDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; total: number; count: number }[]> {
    const startISO = localDateToStartISO(startDate);
    const endISO = localDateToEndISO(endDate);
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, total')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO)
      .order('transaction_date', { ascending: true });
    if (error) throw error;
    const map = new Map<string, { total: number; count: number }>();
    for (const row of (data ?? [])) {
      const date = isoToLocalDateString(row.transaction_date);
      const existing = map.get(date) ?? { total: 0, count: 0 };
      map.set(date, { total: existing.total + (row.total ?? 0), count: existing.count + 1 });
    }
    return Array.from(map.entries())
      .map(([date, val]) => ({ date, total: val.total, count: val.count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getDailyItemsEconomics(
    days: number = 7
  ): Promise<{ date: string; profit: number; capitalSold: number; handlingTotal: number }[]> {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startISO = getLocalDayRangeISO(start).startISO;
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, transaction_items(product_price, cost_price, handling_fee, quantity)')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO);
    if (error) throw error;
    const map = new Map<string, { profit: number; capitalSold: number; handlingTotal: number }>();
    for (const txn of (data ?? []) as any[]) {
      const date = isoToLocalDateString(txn.transaction_date);
      const existing = map.get(date) ?? { profit: 0, capitalSold: 0, handlingTotal: 0 };
      for (const item of (txn.transaction_items ?? [])) {
        const price = item.product_price ?? 0;
        const cost = item.cost_price ?? 0;
        const handling = item.handling_fee ?? 0;
        const qty = item.quantity ?? 1;
        existing.profit += (price - cost) * qty;
        existing.capitalSold += cost * qty;
        existing.handlingTotal += handling * qty;
      }
      map.set(date, existing);
    }
    return Array.from(map.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days);
  },

  async getDailyItemsEconomicsDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; profit: number; capitalSold: number; handlingTotal: number }[]> {
    const startISO = localDateToStartISO(startDate);
    const endISO = localDateToEndISO(endDate);
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, transaction_items(product_price, cost_price, handling_fee, quantity)')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO);
    if (error) throw error;
    const map = new Map<string, { profit: number; capitalSold: number; handlingTotal: number }>();
    for (const txn of (data ?? []) as any[]) {
      const date = isoToLocalDateString(txn.transaction_date);
      const existing = map.get(date) ?? { profit: 0, capitalSold: 0, handlingTotal: 0 };
      for (const item of (txn.transaction_items ?? [])) {
        const price = item.product_price ?? 0;
        const cost = item.cost_price ?? 0;
        const handling = item.handling_fee ?? 0;
        const qty = item.quantity ?? 1;
        existing.profit += (price - cost) * qty;
        existing.capitalSold += cost * qty;
        existing.handlingTotal += handling * qty;
      }
      map.set(date, existing);
    }
    return Array.from(map.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getTransactionSummary(startDate: string, endDate: string): Promise<{
    totalTransaksi: number;
    totalPendapatan: number;
    totalModal: number;
    totalLaba: number;
    totalBiayaPenanganan: number;
  }> {
    const startISO = localDateToStartISO(startDate);
    const endISO = localDateToEndISO(endDate);
    const { data, error } = await supabase.rpc('get_transaction_summary', {
      p_start: startISO,
      p_end: endISO,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalTransaksi: Number(row?.total_transaksi ?? 0),
      totalPendapatan: Number(row?.total_pendapatan ?? 0),
      totalModal: Number(row?.total_modal ?? 0),
      totalLaba: Number(row?.total_laba ?? 0),
      totalBiayaPenanganan: Number(row?.total_biaya_penanganan ?? 0),
    };
  },

  async getTodayItemsEconomics(): Promise<{ profit: number; capitalSold: number; handlingTotal: number }> {
    const { startISO, endISO } = getLocalDayRangeISO(new Date());
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_items(product_price, cost_price, handling_fee, quantity)')
      .eq('is_deleted', false)
      .gte('transaction_date', startISO)
      .lt('transaction_date', endISO);
    if (error) throw error;
    let profit = 0, capitalSold = 0, handlingTotal = 0;
    for (const txn of (data ?? []) as any[]) {
      for (const item of (txn.transaction_items ?? [])) {
        const price = item.product_price ?? 0;
        const cost = item.cost_price ?? 0;
        const handling = item.handling_fee ?? 0;
        const qty = item.quantity ?? 1;
        profit += (price - cost) * qty;
        capitalSold += cost * qty;
        handlingTotal += handling * qty;
      }
    }
    return { profit, capitalSold, handlingTotal };
  },

  // ─── WRITE METHOD (SQLite — offline-first checkout) ───────────────────────

  async create(data: {
    items: CartItem[];
    customer_name?: string;
    customer_whatsapp?: string;
    customer_id?: string;
    employee_id: string;
    employee_name: string;
    discount?: number;
    tax?: number;
    payment_method: 'cash' | 'transfer' | 'qris';
    notes?: string;
    device_id: string;
  }): Promise<Transaction> {
    const db = await getDatabase();
    const now = nowISO();
    const txnId = generateLocalId();
    const txnNumber = generateTransactionNumber();
    const subtotal = data.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const discount = data.discount ?? 0;
    const tax = data.tax ?? 0;
    const total = subtotal - discount + tax;

    let customerId = data.customer_id ?? null;

    if (data.customer_name?.trim() && data.customer_whatsapp?.trim()) {
      const customer = await customerRepository.findOrCreate({
        name: data.customer_name.trim(),
        whatsapp: data.customer_whatsapp.trim(),
        device_id: data.device_id,
        user_id: data.employee_id,
      });
      customerId = customer.local_id;
    }

    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync(
        `INSERT INTO transactions (local_id, transaction_number, customer_id, customer_name, customer_whatsapp, employee_id, employee_name, subtotal, discount, tax, total, payment_method, notes, transaction_date, sync_status, created_at_local, updated_at_local, device_id, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_upload', ?, ?, ?, ?, ?, 0)`,
        [txnId, txnNumber, customerId, data.customer_name ?? null, data.customer_whatsapp ?? null, data.employee_id, data.employee_name, subtotal, discount, tax, total, data.payment_method, data.notes ?? null, now, now, now, data.device_id, data.employee_id, data.employee_id]
      );

      for (const item of data.items) {
        const itemId = generateLocalId();
        const itemSubtotal = item.product.price * item.quantity;
        await txn.runAsync(
          `INSERT INTO transaction_items (local_id, transaction_local_id, product_local_id, product_name, product_price, cost_price, handling_fee, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, txnId, item.product.local_id, item.product.name, item.product.price, item.product.cost_price ?? 0, item.product.handling_fee ?? 0, item.quantity, itemSubtotal]
        );

        await txn.runAsync(
          'UPDATE products SET stock = MAX(0, stock - ?), updated_at_local = ? WHERE local_id = ?',
          [item.quantity, now, item.product.local_id]
        );
      }
    });

    if (customerId) {
      await customerRepository.incrementStats(customerId, total, data.employee_id);
    }

    // Attempt immediate Supabase upload so dashboards/reports reflect the new transaction
    // right away without waiting for a manual sync. If offline or upload fails, the
    // transaction stays as pending_upload and the Sync Center handles it later.
    try {
      const { data: cloudTxn, error: txnErr } = await supabase
        .from('transactions')
        .insert({
          transaction_number: txnNumber,
          customer_name: data.customer_name ?? null,
          customer_whatsapp: data.customer_whatsapp ?? null,
          employee_id: data.employee_id,
          employee_name: data.employee_name,
          subtotal,
          discount,
          tax,
          total,
          payment_method: data.payment_method,
          notes: data.notes ?? null,
          transaction_date: now,
          is_deleted: false,
          device_id: data.device_id,
          created_by: data.employee_id,
          updated_by: data.employee_id,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (!txnErr && cloudTxn?.id) {
        // Save cloud_id immediately so that if items upload fails, a future sync
        // attempt will UPDATE the existing transaction instead of re-inserting.
        const db2 = await getDatabase();
        await db2.runAsync(
          'UPDATE transactions SET cloud_id = ? WHERE local_id = ?',
          [cloudTxn.id, txnId]
        );

        const itemPayloads = data.items.map((item) => ({
          transaction_id: cloudTxn.id,
          product_name: item.product.name,
          product_price: item.product.price,
          cost_price: item.product.cost_price ?? 0,
          handling_fee: item.product.handling_fee ?? 0,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        }));

        const { error: itemsErr } = await supabase
          .from('transaction_items')
          .insert(itemPayloads);

        if (!itemsErr) {
          await this.markSynced(txnId, cloudTxn.id);
        }
      }
    } catch {
      // Network unavailable — transaction will be uploaded via Sync Center
    }

    const created = await this.getCreatedTransaction(txnId);
    return created!;
  },

  // ─── SYNC METHODS (SQLite) ────────────────────────────────────────────────

  /** Fetch a just-created transaction from SQLite (before it's synced to Supabase). */
  async getCreatedTransaction(localId: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE local_id = ?',
      [localId]
    );
    return row ? mapRowToTransaction(row) : null;
  },

  async getPendingSync(): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM transactions WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed')"
    );
    return rows.map(mapRowToTransaction);
  },

  async markSynced(localId: string, cloudId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE transactions SET sync_status = 'synced', cloud_id = ?, last_synced_at = ?, sync_error = NULL WHERE local_id = ?",
      [cloudId, nowISO(), localId]
    );
  },

  async markFailed(localId: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE transactions SET sync_status = 'failed', sync_error = ? WHERE local_id = ?",
      [error, localId]
    );
  },

  async upsertFromCloud(data: any, deviceId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();

    let existing = await db.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE cloud_id = ?',
      [data.id]
    );
    if (!existing) {
      existing = await db.getFirstAsync<any>(
        'SELECT * FROM transactions WHERE transaction_number = ?',
        [data.transaction_number]
      );
    }

    if (existing) {
      await db.runAsync(
        `UPDATE transactions SET cloud_id = ?, sync_status = 'synced', last_synced_at = ?, updated_at_local = ? WHERE local_id = ?`,
        [data.id, now, now, existing.local_id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO transactions (local_id, cloud_id, transaction_number, customer_id, customer_name, customer_whatsapp, employee_id, employee_name, subtotal, discount, tax, total, payment_method, notes, transaction_date, sync_status, created_at_local, updated_at_local, last_synced_at, device_id, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, ?)`,
        [generateLocalId(), data.id, data.transaction_number, data.customer_id, data.customer_name, data.customer_whatsapp, data.employee_id, data.employee_name, data.subtotal, data.discount, data.tax, data.total, data.payment_method, data.notes, data.transaction_date, data.created_at || now, now, now, deviceId, data.created_by || '', data.updated_by || '', data.is_deleted ? 1 : 0]
      );
    }
  },

  async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0');
    return result?.count ?? 0;
  },

  async getByCloudId(cloudId: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE cloud_id = ?',
      [cloudId]
    );
    return row ? mapRowToTransaction(row) : null;
  },

  async getLocalIdByCloudId(cloudId: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT local_id FROM transactions WHERE cloud_id = ?',
      [cloudId]
    );
    return row?.local_id ?? null;
  },

  async replaceItemsFromCloud(localTransactionId: string, items: { product_name: string; product_price: number; cost_price?: number; handling_fee: number; quantity: number; subtotal: number }[]): Promise<void> {
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM transaction_items WHERE transaction_local_id = ?', [localTransactionId]);
      for (const item of items) {
        await txn.runAsync(
          `INSERT INTO transaction_items (local_id, transaction_local_id, product_local_id, product_name, product_price, cost_price, handling_fee, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateLocalId(), localTransactionId, '', item.product_name, item.product_price, item.cost_price ?? 0, item.handling_fee ?? 0, item.quantity, item.subtotal]
        );
      }
    });
  },
};

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

/** Map a Supabase cloud row to the Transaction type. Uses cloud `id` as `local_id` for navigation. */
function mapCloudToTransaction(row: any): Transaction {
  return {
    local_id: row.id,
    cloud_id: row.id,
    transaction_number: row.transaction_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_whatsapp: row.customer_whatsapp,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    subtotal: row.subtotal,
    discount: row.discount,
    tax: row.tax,
    total: row.total,
    payment_method: row.payment_method,
    notes: row.notes,
    transaction_date: row.transaction_date,
    sync_status: 'synced' as SyncStatus,
    sync_error: null,
    created_at_local: row.created_at,
    updated_at_local: row.updated_at,
    last_synced_at: row.updated_at,
    device_id: row.device_id,
    created_by: row.created_by,
    updated_by: row.updated_by,
    is_deleted: !!row.is_deleted,
  };
}

/** Map a Supabase transaction_items row to the TransactionItem type. */
function mapCloudItemToItem(row: any): TransactionItem {
  return {
    local_id: row.id,
    transaction_local_id: row.transaction_id,
    product_local_id: '',
    product_name: row.product_name,
    product_price: row.product_price,
    cost_price: row.cost_price ?? 0,
    handling_fee: row.handling_fee ?? 0,
    quantity: row.quantity,
    subtotal: row.subtotal,
  };
}

/** Map a SQLite row to the Transaction type (used by sync-related methods). */
function mapRowToTransaction(row: any): Transaction {
  return {
    local_id: row.local_id,
    cloud_id: row.cloud_id,
    transaction_number: row.transaction_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_whatsapp: row.customer_whatsapp,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    subtotal: row.subtotal,
    discount: row.discount,
    tax: row.tax,
    total: row.total,
    payment_method: row.payment_method,
    notes: row.notes,
    transaction_date: row.transaction_date,
    sync_status: row.sync_status as SyncStatus,
    sync_error: row.sync_error,
    created_at_local: row.created_at_local,
    updated_at_local: row.updated_at_local,
    last_synced_at: row.last_synced_at,
    device_id: row.device_id,
    created_by: row.created_by,
    updated_by: row.updated_by,
    is_deleted: !!row.is_deleted,
  };
}

/** Map a SQLite transaction_items row to the TransactionItem type. */
function mapRowToItem(row: any): TransactionItem {
  return {
    local_id: row.local_id,
    transaction_local_id: row.transaction_local_id,
    product_local_id: row.product_local_id,
    product_name: row.product_name,
    product_price: row.product_price,
    cost_price: row.cost_price ?? 0,
    handling_fee: row.handling_fee ?? 0,
    quantity: row.quantity,
    subtotal: row.subtotal,
  };
}
