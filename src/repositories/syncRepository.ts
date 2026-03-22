import { getDatabase } from '../database/sqlite/client';
import { SyncLogEntry, SyncSummary } from '../types';
import { generateLocalId, nowISO } from '../utils/helpers';

export const syncRepository = {
  async logEntry(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO sync_log (id, entity_type, entity_local_id, action, status, error_message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [generateLocalId(), entry.entity_type, entry.entity_local_id, entry.action, entry.status, entry.error_message, nowISO()]
    );
  },

  async getRecentLogs(limit = 20): Promise<SyncLogEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return rows;
  },

  async getSummary(): Promise<SyncSummary> {
    const db = await getDatabase();

    const pending = await db.getFirstAsync<any>(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE sync_status IN ('pending_upload', 'pending_delete')) +
        (SELECT COUNT(*) FROM transactions WHERE sync_status IN ('pending_upload', 'pending_delete')) +
        (SELECT COUNT(*) FROM customers WHERE sync_status IN ('pending_upload', 'pending_delete')) +
        (SELECT COUNT(*) FROM attendance WHERE sync_status IN ('pending_upload', 'pending_delete'))
        as count
    `);

    const failed = await db.getFirstAsync<any>(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE sync_status = 'failed') +
        (SELECT COUNT(*) FROM transactions WHERE sync_status = 'failed') +
        (SELECT COUNT(*) FROM customers WHERE sync_status = 'failed') +
        (SELECT COUNT(*) FROM attendance WHERE sync_status = 'failed')
        as count
    `);

    const synced = await db.getFirstAsync<any>(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE sync_status = 'synced') +
        (SELECT COUNT(*) FROM transactions WHERE sync_status = 'synced') +
        (SELECT COUNT(*) FROM customers WHERE sync_status = 'synced') +
        (SELECT COUNT(*) FROM attendance WHERE sync_status = 'synced')
        as count
    `);

    const lastLog = await db.getFirstAsync<any>(
      "SELECT timestamp FROM sync_log WHERE status = 'success' ORDER BY timestamp DESC LIMIT 1"
    );

    return {
      pendingUpload: pending?.count ?? 0,
      failedUpload: failed?.count ?? 0,
      totalSynced: synced?.count ?? 0,
      lastSyncTime: lastLog?.timestamp ?? null,
    };
  },

  async deleteLog(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_log WHERE id = ?', [id]);
  },

  async clearAllLogs(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_log');
  },

  async clearOldLogs(daysOld = 30): Promise<void> {
    const db = await getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    await db.runAsync(
      'DELETE FROM sync_log WHERE timestamp < ?',
      [cutoff.toISOString()]
    );
  },

  async getPendingSyncDetail(): Promise<{
    products: { local_id: string; name: string; sku: string; sync_status: string }[];
    transactions: { local_id: string; transaction_number: string; transaction_date: string; total: number; sync_status: string }[];
    customers: { local_id: string; name: string; whatsapp: string; sync_status: string }[];
    attendance: { local_id: string; employee_name: string; date: string; clock_in: string; sync_status: string }[];
  }> {
    const db = await getDatabase();

    const products = await db.getAllAsync<any>(
      "SELECT local_id, name, sku, sync_status FROM products WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed') ORDER BY updated_at_local DESC"
    );
    const transactions = await db.getAllAsync<any>(
      "SELECT local_id, transaction_number, transaction_date, total, sync_status FROM transactions WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed') ORDER BY transaction_date DESC"
    );
    const customers = await db.getAllAsync<any>(
      "SELECT local_id, name, whatsapp, sync_status FROM customers WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed') ORDER BY updated_at_local DESC"
    );
    const attendance = await db.getAllAsync<any>(
      "SELECT local_id, employee_name, date, clock_in, sync_status FROM attendance WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed') ORDER BY date DESC"
    );

    return {
      products: products ?? [],
      transactions: transactions ?? [],
      customers: customers ?? [],
      attendance: attendance ?? [],
    };
  },
};
