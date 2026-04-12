import { getDatabase } from '../database/sqlite/client';
import { Transaction, TransactionItem, CartItem, SyncStatus } from '../types';
import {
  generateLocalId,
  generateTransactionNumber,
  getLocalDayRangeISO,
  nowISO,
  todayDateString,
} from '../utils/helpers';
import { customerRepository } from './customerRepository';

export const transactionRepository = {
  async getAll(limit = 50, offset = 0): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY transaction_date DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(mapRowToTransaction);
  },

  async getForLocalCalendarDay(day: Date, limit = 100): Promise<Transaction[]> {
    const { startISO, endISO } = getLocalDayRangeISO(day);
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM transactions WHERE is_deleted = 0 AND transaction_date >= ? AND transaction_date < ? ORDER BY transaction_date DESC LIMIT ?`,
      [startISO, endISO, limit]
    );
    return rows.map(mapRowToTransaction);
  },

  async getById(localId: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE local_id = ?',
      [localId]
    );
    return row ? mapRowToTransaction(row) : null;
  },

  async getItems(transactionLocalId: string): Promise<TransactionItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transaction_items WHERE transaction_local_id = ?',
      [transactionLocalId]
    );
    return rows.map(mapRowToItem);
  },

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

    return (await this.getById(txnId))!;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transactions WHERE is_deleted = 0 AND transaction_date >= ? AND transaction_date <= ? ORDER BY transaction_date DESC',
      [startDate, endDate]
    );
    return rows.map(mapRowToTransaction);
  },

  async getTodayTotal(): Promise<{ count: number; total: number }> {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const result = await db.getFirstAsync<any>(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM transactions WHERE is_deleted = 0 AND date(transaction_date) = ?",
      [today]
    );
    return { count: result?.count ?? 0, total: result?.total ?? 0 };
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

  async getDailySummary(days: number = 7): Promise<{ date: string; total: number; count: number }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT date(transaction_date) as date, SUM(total) as total, COUNT(*) as count
       FROM transactions WHERE is_deleted = 0
       GROUP BY date(transaction_date)
       ORDER BY date DESC LIMIT ?`,
      [days]
    );
    return rows.map((r: any) => ({ date: r.date, total: r.total, count: r.count }));
  },

  async getDailySummaryDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; total: number; count: number }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT date(transaction_date) as date, SUM(total) as total, COUNT(*) as count
       FROM transactions WHERE is_deleted = 0
       AND date(transaction_date) >= ? AND date(transaction_date) <= ?
       GROUP BY date(transaction_date)
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    return rows.map((r: any) => ({ date: r.date, total: r.total, count: r.count }));
  },

  /**
   * Per calendar day: gross profit (Σ(jual−modal)×qty), total capital (modal×qty), total handling fees.
   */
  async getDailyItemsEconomics(
    days: number = 7
  ): Promise<
    { date: string; profit: number; capitalSold: number; handlingTotal: number }[]
  > {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT
         date(t.transaction_date) AS d,
         SUM((ti.product_price - ti.cost_price) * ti.quantity) AS profit,
         SUM(ti.cost_price * ti.quantity) AS capital_sold,
         SUM(ti.handling_fee * ti.quantity) AS handling_total
       FROM transaction_items ti
       INNER JOIN transactions t ON t.local_id = ti.transaction_local_id AND t.is_deleted = 0
       GROUP BY date(t.transaction_date)
       ORDER BY d DESC
       LIMIT ?`,
      [days]
    );
    return rows.map((r: any) => ({
      date: r.d,
      profit: r.profit ?? 0,
      capitalSold: r.capital_sold ?? 0,
      handlingTotal: r.handling_total ?? 0,
    }));
  },

  async getDailyItemsEconomicsDateRange(
    startDate: string,
    endDate: string
  ): Promise<
    { date: string; profit: number; capitalSold: number; handlingTotal: number }[]
  > {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT
         date(t.transaction_date) AS d,
         SUM((ti.product_price - ti.cost_price) * ti.quantity) AS profit,
         SUM(ti.cost_price * ti.quantity) AS capital_sold,
         SUM(ti.handling_fee * ti.quantity) AS handling_total
       FROM transaction_items ti
       INNER JOIN transactions t ON t.local_id = ti.transaction_local_id AND t.is_deleted = 0
       WHERE date(t.transaction_date) >= ? AND date(t.transaction_date) <= ?
       GROUP BY date(t.transaction_date)
       ORDER BY d ASC`,
      [startDate, endDate]
    );
    return rows.map((r: any) => ({
      date: r.d,
      profit: r.profit ?? 0,
      capitalSold: r.capital_sold ?? 0,
      handlingTotal: r.handling_total ?? 0,
    }));
  },

  /** Today's aggregates from line items (local calendar date). */
  async getTodayItemsEconomics(): Promise<{
    profit: number;
    capitalSold: number;
    handlingTotal: number;
  }> {
    const db = await getDatabase();
    const today = todayDateString();
    const row = await db.getFirstAsync<any>(
      `SELECT
         SUM((ti.product_price - ti.cost_price) * ti.quantity) AS profit,
         SUM(ti.cost_price * ti.quantity) AS capital_sold,
         SUM(ti.handling_fee * ti.quantity) AS handling_total
       FROM transaction_items ti
       INNER JOIN transactions t ON t.local_id = ti.transaction_local_id AND t.is_deleted = 0
       WHERE date(t.transaction_date) = date(?)`,
      [today]
    );
    return {
      profit: row?.profit ?? 0,
      capitalSold: row?.capital_sold ?? 0,
      handlingTotal: row?.handling_total ?? 0,
    };
  },
};

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
