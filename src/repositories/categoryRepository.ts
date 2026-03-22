import { getDatabase } from '../database/sqlite/client';
import { Category } from '../types';
import { generateLocalId, nowISO } from '../utils/helpers';

export const categoryRepository = {
  async getAll(): Promise<Category[]> {
    const db = await getDatabase();
    return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  },

  async create(name: string): Promise<Category> {
    const db = await getDatabase();
    const id = 'cat_' + generateLocalId().slice(0, 12);
    const maxOrder = await db.getFirstAsync<any>('SELECT MAX(sort_order) as m FROM categories');
    const sortOrder = (maxOrder?.m ?? 0) + 1;
    const now = nowISO();
    await db.runAsync(
      'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), sortOrder, now]
    );
    return { id, name: name.trim(), sort_order: sortOrder, created_at: now };
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  },

  async exists(name: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
      [name.trim()]
    );
    return !!row;
  },

  async upsertFromCloud(data: { id: string; name: string; sort_order: number; created_at: string }): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<any>('SELECT id FROM categories WHERE id = ?', [data.id]);
    if (existing) {
      await db.runAsync(
        'UPDATE categories SET name = ?, sort_order = ? WHERE id = ?',
        [data.name, data.sort_order, data.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
        [data.id, data.name, data.sort_order, data.created_at || nowISO()]
      );
    }
  },
};
