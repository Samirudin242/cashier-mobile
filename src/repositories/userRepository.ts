import { getDatabase } from '../database/sqlite/client';
import { supabase } from '../config/supabase';
import { User, UserRole } from '../types';
import { generateLocalId, nowISO } from '../utils/helpers';

export const userRepository = {
  async findByAccessCode(code: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM users WHERE access_code = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );
    return row ? mapRow(row) : null;
  },

  async getById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return row ? mapRow(row) : null;
  },

  async getAll(): Promise<User[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC'
    );
    return rows.map(mapRow);
  },

  async getEmployees(): Promise<User[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM users WHERE role = 'employee' AND is_active = 1 ORDER BY name ASC"
    );
    return rows.map(mapRow);
  },

  async createEmployee(data: { name: string; accessCode: string; dailySalary: number; bonusPercent: number; storeId?: string }): Promise<User> {
    const db = await getDatabase();
    const id = 'usr_' + generateLocalId().slice(0, 12);
    const code = data.accessCode.trim().toUpperCase();
    await db.runAsync(
      'INSERT INTO users (id, name, role, access_code, store_id, is_active, daily_salary, bonus_percent, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
      [id, data.name.trim(), 'employee', code, data.storeId ?? 'default_store', data.dailySalary, data.bonusPercent, nowISO()]
    );
    return { id, name: data.name.trim(), role: 'employee', access_code: code, store_id: data.storeId ?? 'default_store', is_active: true, daily_salary: data.dailySalary, bonus_percent: data.bonusPercent };
  },

  async updateEmployee(id: string, data: { name: string; dailySalary: number; bonusPercent: number }): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE users SET name = ?, daily_salary = ?, bonus_percent = ? WHERE id = ?',
      [data.name.trim(), data.dailySalary, data.bonusPercent, id]
    );
  },

  async deactivateEmployee(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  },

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<any>(
      'SELECT * FROM attendance WHERE employee_id = ? AND date >= ? AND date <= ? AND is_deleted = 0 ORDER BY date ASC',
      [employeeId, startDate, endDate]
    );
  },

  async getEmployeeTransactionBonus(employeeId: string, startDate: string, endDate: string, bonusPercent: number) {
    const db = await getDatabase();
    const pct = bonusPercent / 100;
    // Use date() for robust filtering across ISO/format variations (e.g. from Supabase sync)
    const rows = await db.getAllAsync<any>(
      `SELECT t.local_id, t.transaction_number, t.transaction_date,
              ti.product_name, ti.handling_fee, ti.quantity, ti.subtotal
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_local_id = t.local_id
       WHERE t.employee_id = ? AND date(t.transaction_date) >= date(?) AND date(t.transaction_date) <= date(?) AND t.is_deleted = 0
       ORDER BY t.transaction_date ASC, ti.local_id ASC`,
      [employeeId, startDate, endDate]
    );

    // Group by transaction, compute per-item bonus (handling_fee * quantity * pct)
    const txMap = new Map<string, { transactionNumber: string; date: string; items: any[]; itemsTotal: number; handlingTotal: number }>();
    for (const r of rows) {
      const tid = r.local_id;
      const handlingFee = (r.handling_fee as number) ?? 0;
      const qty = (r.quantity as number) ?? 1;
      const handlingForItem = handlingFee * qty;
      const itemBonus = handlingForItem * pct;

      if (!txMap.has(tid)) {
        txMap.set(tid, {
          transactionNumber: r.transaction_number,
          date: r.transaction_date,
          items: [],
          itemsTotal: 0,
          handlingTotal: 0,
        });
      }
      const tx = txMap.get(tid)!;
      tx.items.push({
        productName: r.product_name,
        handlingFee: handlingForItem,
        quantity: qty,
        bonus: itemBonus,
      });
      tx.itemsTotal += (r.subtotal as number) ?? 0;
      tx.handlingTotal += handlingForItem;
    }

    return Array.from(txMap.values()).map((tx) => {
      const net = Math.max(0, tx.itemsTotal - tx.handlingTotal);
      const bonus = tx.items.reduce((sum, i) => sum + i.bonus, 0);
      return {
        transactionNumber: tx.transactionNumber,
        date: tx.date,
        itemsTotal: tx.itemsTotal,
        handlingTotal: tx.handlingTotal,
        net,
        bonus,
        items: tx.items,
      };
    });
  },

  /**
   * Check Supabase whether this access_code is already locked to another device.
   * Returns null if free, or the locked device_id if taken.
   */
  async checkCloudDeviceLock(accessCode: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('users')
      .select('logged_in_device_id')
      .eq('access_code', accessCode.trim().toUpperCase())
      .maybeSingle();

    if (error) throw error;
    return data?.logged_in_device_id ?? null;
  },

  /**
   * Lock the access code to this device in Supabase.
   */
  async lockDeviceInCloud(accessCode: string, deviceId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ logged_in_device_id: deviceId })
      .eq('access_code', accessCode.trim().toUpperCase());

    if (error) throw error;
  },

  /**
   * Unlock the access code from this device in Supabase (on logout).
   */
  async unlockDeviceInCloud(accessCode: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ logged_in_device_id: null })
      .eq('access_code', accessCode.trim().toUpperCase());

    if (error) throw error;
  },

  /**
   * Update local DB to reflect the device lock.
   */
  async setLocalDeviceLock(userId: string, deviceId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE users SET logged_in_device_id = ? WHERE id = ?',
      [deviceId, userId]
    );
  },
};

function mapRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role as UserRole,
    access_code: row.access_code,
    store_id: row.store_id,
    is_active: !!row.is_active,
    daily_salary: row.daily_salary ?? 0,
    bonus_percent: row.bonus_percent ?? 10,
  };
}
