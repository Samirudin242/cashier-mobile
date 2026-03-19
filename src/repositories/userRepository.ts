import { getDatabase } from '../database/sqlite/client';
import { supabase } from '../config/supabase';
import { User, UserRole } from '../types';

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
  };
}
