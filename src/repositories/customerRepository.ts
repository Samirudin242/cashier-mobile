import { getDatabase } from '../database/sqlite/client';
import { Customer, SyncStatus } from '../types';
import { generateLocalId, nowISO } from '../utils/helpers';

export const customerRepository = {
  async getAll(): Promise<Customer[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM customers WHERE is_deleted = 0 ORDER BY name ASC'
    );
    return rows.map(mapRow);
  },

  async getById(localId: string): Promise<Customer | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM customers WHERE local_id = ?',
      [localId]
    );
    return row ? mapRow(row) : null;
  },

  async search(query: string): Promise<Customer[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM customers WHERE is_deleted = 0 AND (name LIKE ? OR whatsapp LIKE ?) ORDER BY name ASC',
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(mapRow);
  },

  async create(data: {
    name: string;
    whatsapp: string;
    email?: string;
    address?: string;
    device_id: string;
    user_id: string;
  }): Promise<Customer> {
    const db = await getDatabase();
    const now = nowISO();
    const localId = generateLocalId();

    await db.runAsync(
      `INSERT INTO customers (local_id, name, whatsapp, email, address, total_transactions, total_spent, sync_status, created_at_local, updated_at_local, device_id, created_by, updated_by, is_deleted)
       VALUES (?, ?, ?, ?, ?, 0, 0, 'pending_upload', ?, ?, ?, ?, ?, 0)`,
      [localId, data.name, data.whatsapp, data.email ?? null, data.address ?? null, now, now, data.device_id, data.user_id, data.user_id]
    );

    return (await this.getById(localId))!;
  },

  async update(localId: string, data: Partial<Pick<Customer, 'name' | 'whatsapp' | 'email' | 'address'>>, userId: string): Promise<Customer | null> {
    const db = await getDatabase();
    const now = nowISO();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.whatsapp !== undefined) { fields.push('whatsapp = ?'); values.push(data.whatsapp); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }

    fields.push("updated_at_local = ?", "updated_by = ?", "sync_status = 'pending_upload'");
    values.push(now, userId, localId);

    await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE local_id = ?`, values);
    return this.getById(localId);
  },

  async incrementStats(localId: string, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE customers SET total_transactions = total_transactions + 1, total_spent = total_spent + ? WHERE local_id = ?',
      [amount, localId]
    );
  },

  async getPendingSync(): Promise<Customer[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM customers WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed')"
    );
    return rows.map(mapRow);
  },

  async markSynced(localId: string, cloudId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE customers SET sync_status = 'synced', cloud_id = ?, last_synced_at = ?, sync_error = NULL WHERE local_id = ?",
      [cloudId, nowISO(), localId]
    );
  },

  async markFailed(localId: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE customers SET sync_status = 'failed', sync_error = ? WHERE local_id = ?",
      [error, localId]
    );
  },

  async upsertFromCloud(data: any, deviceId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();

    let existing = await db.getFirstAsync<any>('SELECT * FROM customers WHERE cloud_id = ?', [data.id]);
    if (!existing && data.whatsapp) {
      existing = await db.getFirstAsync<any>(
        'SELECT * FROM customers WHERE whatsapp = ? AND cloud_id IS NULL',
        [data.whatsapp]
      );
    }

    if (existing) {
      await db.runAsync(
        `UPDATE customers SET cloud_id = ?, name = ?, whatsapp = ?, email = ?, address = ?, total_transactions = ?, total_spent = ?, sync_status = 'synced', last_synced_at = ?, updated_at_local = ? WHERE local_id = ?`,
        [data.id, data.name, data.whatsapp, data.email, data.address, data.total_transactions ?? 0, data.total_spent ?? 0, now, now, existing.local_id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO customers (local_id, cloud_id, name, whatsapp, email, address, total_transactions, total_spent, sync_status, created_at_local, updated_at_local, last_synced_at, device_id, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, 0)`,
        [generateLocalId(), data.id, data.name, data.whatsapp, data.email, data.address, data.total_transactions ?? 0, data.total_spent ?? 0, data.created_at || now, now, now, deviceId, data.created_by || '', data.updated_by || '']
      );
    }
  },
};

function mapRow(row: any): Customer {
  return {
    local_id: row.local_id,
    cloud_id: row.cloud_id,
    name: row.name,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    total_transactions: row.total_transactions,
    total_spent: row.total_spent,
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
