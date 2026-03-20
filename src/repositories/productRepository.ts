import { getDatabase } from '../database/sqlite/client';
import { Product, SyncStatus } from '../types';
import { generateLocalId, nowISO } from '../utils/helpers';

export const productRepository = {
  async getAll(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM products WHERE is_deleted = 0 ORDER BY name ASC'
    );
    return rows.map(mapRowToProduct);
  },

  async getActive(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM products WHERE is_deleted = 0 AND is_active = 1 ORDER BY name ASC'
    );
    return rows.map(mapRowToProduct);
  },

  async getById(localId: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM products WHERE local_id = ?',
      [localId]
    );
    return row ? mapRowToProduct(row) : null;
  },

  async search(query: string): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM products WHERE is_deleted = 0 AND (name LIKE ? OR sku LIKE ?) ORDER BY name ASC',
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(mapRowToProduct);
  },

  async create(data: {
    name: string;
    sku: string;
    price: number;
    cost_price: number;
    handling_fee: number;
    stock: number;
    category: string;
    device_id: string;
    user_id: string;
  }): Promise<Product> {
    const db = await getDatabase();
    const now = nowISO();
    const localId = generateLocalId();

    await db.runAsync(
      `INSERT INTO products (local_id, name, sku, price, cost_price, handling_fee, stock, category, is_active, sync_status, created_at_local, updated_at_local, device_id, created_by, updated_by, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending_upload', ?, ?, ?, ?, ?, 0)`,
      [localId, data.name, data.sku, data.price, data.cost_price, data.handling_fee, data.stock, data.category, now, now, data.device_id, data.user_id, data.user_id]
    );

    return (await this.getById(localId))!;
  },

  async update(localId: string, data: Partial<Pick<Product, 'name' | 'sku' | 'price' | 'cost_price' | 'handling_fee' | 'stock' | 'category' | 'is_active'>>, userId: string): Promise<Product | null> {
    const db = await getDatabase();
    const now = nowISO();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.cost_price !== undefined) { fields.push('cost_price = ?'); values.push(data.cost_price); }
    if (data.handling_fee !== undefined) { fields.push('handling_fee = ?'); values.push(data.handling_fee); }
    if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    fields.push("updated_at_local = ?", "updated_by = ?", "sync_status = 'pending_upload'");
    values.push(now, userId, localId);

    await db.runAsync(
      `UPDATE products SET ${fields.join(', ')} WHERE local_id = ?`,
      values
    );

    return this.getById(localId);
  },

  async softDelete(localId: string, userId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      `UPDATE products SET is_deleted = 1, sync_status = 'pending_delete', updated_at_local = ?, updated_by = ? WHERE local_id = ?`,
      [now, userId, localId]
    );
  },

  async decrementStock(localId: string, quantity: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE products SET stock = MAX(0, stock - ?), updated_at_local = ? WHERE local_id = ?',
      [quantity, nowISO(), localId]
    );
  },

  async getPendingSync(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM products WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed')"
    );
    return rows.map(mapRowToProduct);
  },

  async markSynced(localId: string, cloudId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE products SET sync_status = 'synced', cloud_id = ?, last_synced_at = ?, sync_error = NULL WHERE local_id = ?",
      [cloudId, nowISO(), localId]
    );
  },

  async markFailed(localId: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE products SET sync_status = 'failed', sync_error = ? WHERE local_id = ?",
      [error, localId]
    );
  },

  async upsertFromCloud(data: any, deviceId: string): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<any>(
      'SELECT * FROM products WHERE cloud_id = ?',
      [data.id]
    );

    const now = nowISO();
    if (existing) {
      await db.runAsync(
        `UPDATE products SET name = ?, sku = ?, price = ?, cost_price = ?, stock = ?, category = ?, is_active = ?, is_deleted = ?, sync_status = 'synced', last_synced_at = ?, updated_at_local = ? WHERE cloud_id = ?`,
        [data.name, data.sku, data.price, data.cost_price, data.stock, data.category, data.is_active ? 1 : 0, data.is_deleted ? 1 : 0, now, now, data.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO products (local_id, cloud_id, name, sku, price, cost_price, stock, category, is_active, sync_status, created_at_local, updated_at_local, last_synced_at, device_id, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, ?)`,
        [generateLocalId(), data.id, data.name, data.sku, data.price, data.cost_price, data.stock, data.category, data.is_active ? 1 : 0, data.created_at || now, now, now, deviceId, data.created_by || '', data.updated_by || '', data.is_deleted ? 1 : 0]
      );
    }
  },

  async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM products WHERE is_deleted = 0');
    return result?.count ?? 0;
  },
};

function mapRowToProduct(row: any): Product {
  return {
    local_id: row.local_id,
    cloud_id: row.cloud_id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    cost_price: row.cost_price,
    handling_fee: row.handling_fee ?? 0,
    stock: row.stock,
    category: row.category,
    image_url: row.image_url,
    is_active: !!row.is_active,
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
