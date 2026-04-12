import { getDatabase } from "../database/sqlite/client";
import { supabase } from "../config/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { User, UserRole } from "../types";
import { generateLocalId, nowISO } from "../utils/helpers";

/** Cloud DB may not have `allowance` until migration is applied; PostgREST errors vary by version. */
function isAllowanceColumnMissing(error: PostgrestError | null): boolean {
  if (!error) return false;
  const m = (error.message ?? "").toLowerCase();
  const c = (error.code ?? "").toLowerCase();
  if (!m.includes("allowance")) return false;
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find") ||
    c === "42703" ||
    c === "pgrst204"
  );
}

/** Match `access_code` when cloud rows may be mixed-case (Postgres `text` equality is case-sensitive). */
function accessCodeMatchVariants(code: string): string[] {
  const t = code.trim();
  if (!t) return [];
  return Array.from(new Set([t, t.toUpperCase(), t.toLowerCase()]));
}

export const userRepository = {
  /**
   * Find user by access code in Supabase (cloud). Use this for login.
   */
  async findByAccessCodeFromSupabase(code: string): Promise<User | null> {
    const variants = accessCodeMatchVariants(code);
    if (variants.length === 0) return null;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("access_code", variants)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      role: data.role as User["role"],
      access_code: data.access_code,
      store_id: data.store_id ?? "default_store",
      is_active: !!data.is_active,
      daily_salary: data.daily_salary ?? 0,
      bonus_percent: data.bonus_percent ?? 10,
      allowance: data.allowance ?? 0,
    };
  },

  /**
   * Upsert user from Supabase into local SQLite (for offline features like getEmployees).
   * Matches by id first; if not found, matches by access_code to avoid UNIQUE violation
   * when cloud id differs from local (e.g. different devices/sources).
   */
  async upsertUserToLocal(user: User): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    let existing = await db.getFirstAsync<any>(
      "SELECT id FROM users WHERE id = ?",
      [user.id]
    );
    if (!existing) {
      existing = await db.getFirstAsync<any>(
        "SELECT id FROM users WHERE access_code = ?",
        [user.access_code]
      );
    }
    if (existing) {
      await db.runAsync(
        `UPDATE users SET name = ?, role = ?, access_code = ?, store_id = ?, is_active = ?, daily_salary = ?, bonus_percent = ?, allowance = ? WHERE id = ?`,
        [
          user.name,
          user.role,
          user.access_code,
          user.store_id,
          user.is_active ? 1 : 0,
          user.daily_salary,
          user.bonus_percent,
          user.allowance ?? 0,
          existing.id,
        ]
      );
    } else {
      await db.runAsync(
        "INSERT INTO users (id, name, role, access_code, store_id, is_active, daily_salary, bonus_percent, allowance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          user.id,
          user.name,
          user.role,
          user.access_code,
          user.store_id,
          user.is_active ? 1 : 0,
          user.daily_salary,
          user.bonus_percent,
          user.allowance ?? 0,
          now,
        ]
      );
    }
  },

  async findByAccessCode(code: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM users WHERE access_code = ? AND is_active = 1",
      [code.trim().toUpperCase()]
    );
    return row ? mapRow(row) : null;
  },

  async getById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    return row ? mapRow(row) : null;
  },

  async getAll(): Promise<User[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC"
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

  /**
   * Upload/upsert user to Supabase for sync. Used when owner adds or updates employees.
   */
  async uploadUserToSupabase(user: User): Promise<void> {
    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
      access_code: user.access_code,
      store_id: user.store_id,
      is_active: user.is_active,
      daily_salary: user.daily_salary,
      bonus_percent: user.bonus_percent,
      allowance: user.allowance ?? 0,
    };
    let { error } = await supabase.from("users").upsert(payload, { onConflict: "access_code" });
    if (error && isAllowanceColumnMissing(error)) {
      const { allowance: _a, ...withoutAllowance } = payload;
      ({ error } = await supabase
        .from("users")
        .upsert(withoutAllowance, { onConflict: "access_code" }));
    }
    if (error) {
      if (error.code === "23505") {
        throw new Error("Kode akses sudah digunakan. Gunakan kode lain.");
      }
      throw error;
    }
  },

  /**
   * Free access_code for reuse: inactive users keep the row (FK-safe) but get a unique archival code.
   */
  async reclaimAccessCodeFromInactive(accessCode: string): Promise<void> {
    const code = accessCode.trim().toUpperCase();
    const archival = (original: string, userId: string) => {
      const base = String(original)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const tail = userId.replace(/[^a-z0-9]/gi, "").slice(-12) || "X";
      const next = `${base}_OFF_${tail}`;
      return next.length > 72 ? next.slice(0, 72) : next;
    };

    const db = await getDatabase();
    const local = await db.getFirstAsync<any>(
      "SELECT * FROM users WHERE access_code = ?",
      [code]
    );
    if (local && !local.is_active) {
      const nextCode = archival(code, local.id);
      await db.runAsync("UPDATE users SET access_code = ? WHERE id = ?", [
        nextCode,
        local.id,
      ]);
      try {
        await supabase
          .from("users")
          .update({ access_code: nextCode })
          .eq("id", local.id);
      } catch {
        /* offline */
      }
    }

    const { data: cloud } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("access_code", code)
      .maybeSingle();

    if (cloud && cloud.is_active === false) {
      const nextCode = archival(code, cloud.id);
      await supabase.from("users").update({ access_code: nextCode }).eq("id", cloud.id);
      const localMatch = await db.getFirstAsync<any>(
        "SELECT id, access_code FROM users WHERE id = ?",
        [cloud.id]
      );
      if (localMatch && localMatch.access_code === code) {
        await db.runAsync("UPDATE users SET access_code = ? WHERE id = ?", [
          nextCode,
          cloud.id,
        ]);
      }
    }
  },

  async createEmployee(data: {
    name: string;
    accessCode: string;
    dailySalary: number;
    bonusPercent: number;
    allowance?: number;
    storeId?: string;
  }): Promise<User> {
    const id = "usr_" + generateLocalId().slice(0, 12);
    const code = data.accessCode.trim().toUpperCase();

    await this.reclaimAccessCodeFromInactive(code);

    const db = await getDatabase();
    const activeLocal = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM users WHERE access_code = ? AND is_active = 1",
      [code]
    );
    if (activeLocal) {
      throw new Error(
        "Kode akses sudah dipakai karyawan aktif. Gunakan kode lain."
      );
    }

    const { data: cloudRow } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("access_code", code)
      .maybeSingle();
    if (cloudRow?.is_active === true) {
      throw new Error(
        "Kode akses sudah dipakai di server. Gunakan kode lain."
      );
    }

    const allowance = data.allowance ?? 0;
    const user: User = {
      id,
      name: data.name.trim(),
      role: "employee",
      access_code: code,
      store_id: data.storeId ?? "default_store",
      is_active: true,
      daily_salary: data.dailySalary,
      bonus_percent: data.bonusPercent,
      allowance,
    };

    await this.uploadUserToSupabase(user);

    try {
      await db.runAsync(
        "INSERT INTO users (id, name, role, access_code, store_id, is_active, daily_salary, bonus_percent, allowance, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
        [
          id,
          user.name,
          user.role,
          user.access_code,
          user.store_id,
          user.daily_salary,
          user.bonus_percent,
          allowance,
          nowISO(),
        ]
      );
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("UNIQUE") && msg.includes("access_code")) {
        throw new Error(
          "Kode akses bentrok dengan data lama. Coba kode lain, atau sinkronkan data lalu coba lagi."
        );
      }
      throw e;
    }

    return user;
  },

  async updateEmployee(
    id: string,
    data: { name: string; dailySalary: number; bonusPercent: number; allowance?: number }
  ): Promise<void> {
    const db = await getDatabase();
    const allowance = data.allowance ?? 0;
    await db.runAsync(
      "UPDATE users SET name = ?, daily_salary = ?, bonus_percent = ?, allowance = ? WHERE id = ?",
      [data.name.trim(), data.dailySalary, data.bonusPercent, allowance, id]
    );

    const user = await this.getById(id);
    if (user) {
      try {
        await this.uploadUserToSupabase({
          ...user,
          name: data.name.trim(),
          daily_salary: data.dailySalary,
          bonus_percent: data.bonusPercent,
          allowance,
        });
      } catch (err) {
        console.warn("[updateEmployee] Supabase upload failed:", err);
        throw new Error(
          "Perubahan tersimpan lokal, tetapi gagal sinkron ke cloud. Periksa koneksi dan coba sinkron lagi."
        );
      }
    }
  },

  async deactivateEmployee(id: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>("SELECT * FROM users WHERE id = ?", [id]);
    if (!row || !row.is_active) return;

    const archival = (original: string, userId: string) => {
      const base = String(original)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const tail = userId.replace(/[^a-z0-9]/gi, "").slice(-12) || "X";
      const next = `${base}_OFF_${tail}`;
      return next.length > 72 ? next.slice(0, 72) : next;
    };
    const nextCode = archival(row.access_code, id);

    await db.runAsync(
      "UPDATE users SET is_active = 0, access_code = ? WHERE id = ?",
      [nextCode, id]
    );
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: false, access_code: nextCode })
        .eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.warn("[deactivateEmployee] Supabase:", e);
    }
  },

  async getEmployeeAttendance(
    employeeId: string,
    startDate: string,
    endDate: string
  ) {
    const db = await getDatabase();
    const user = await this.getById(employeeId);
    if (!user) return [];

    const dupName = await db.getFirstAsync<{ c: number }>(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'employee' AND is_active = 1 AND TRIM(name) = TRIM(?) COLLATE NOCASE",
      [user.name]
    );
    const onlyOneWithThisName = (dupName?.c ?? 0) === 1;

    if (onlyOneWithThisName) {
      return db.getAllAsync<any>(
        `SELECT * FROM attendance
         WHERE is_deleted = 0
         AND date(date) >= date(?) AND date(date) <= date(?)
         AND (
           employee_id = ?
           OR TRIM(employee_name) = TRIM(?) COLLATE NOCASE
         )
         ORDER BY date ASC`,
        [startDate, endDate, employeeId, user.name]
      );
    }

    return db.getAllAsync<any>(
      `SELECT * FROM attendance
       WHERE is_deleted = 0
       AND date(date) >= date(?) AND date(date) <= date(?)
       AND employee_id = ?
       ORDER BY date ASC`,
      [startDate, endDate, employeeId]
    );
  },

  /**
   * Get bonus-earning transactions for an employee in a date range.
   * Bonus per item: ((harga_jual - harga_modal) - biaya_penanganan) × qty × bonus_percent%
   */
  async getEmployeeTransactionBonus(
    employeeId: string,
    startDate: string,
    endDate: string,
    bonusPercent: number
  ) {
    const db = await getDatabase();
    const pct = bonusPercent / 100;
    const rows = await db.getAllAsync<any>(
      `SELECT t.local_id, t.transaction_number, t.transaction_date,
              ti.product_name, ti.product_price, ti.cost_price, ti.handling_fee, ti.quantity, ti.subtotal
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_local_id = t.local_id
       WHERE t.employee_id = ? AND date(t.transaction_date) >= date(?) AND date(t.transaction_date) <= date(?) AND t.is_deleted = 0
       ORDER BY t.transaction_date ASC, ti.local_id ASC`,
      [employeeId, startDate, endDate]
    );

    const txMap = new Map<
      string,
      {
        transactionNumber: string;
        date: string;
        items: { productName: string; baseForBonus: number; quantity: number; bonus: number }[];
        itemsTotal: number;
        handlingTotal: number;
      }
    >();
    for (const r of rows) {
      const tid = r.local_id;
      const price = (r.product_price as number) ?? 0;
      const costPrice = (r.cost_price as number) ?? 0;
      const handlingFee = (r.handling_fee as number) ?? 0;
      const qty = (r.quantity as number) ?? 1;
      const netPerUnit = Math.max(0, price - costPrice - handlingFee);
      const baseForBonus = netPerUnit * qty;
      const itemBonus = baseForBonus * pct;
      const handlingForItem = handlingFee * qty;

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
        baseForBonus,
        quantity: qty,
        bonus: itemBonus,
      });
      tx.itemsTotal += (r.subtotal as number) ?? 0;
      tx.handlingTotal += handlingForItem;
    }

    return Array.from(txMap.values()).map((tx) => {
      const bonusBase = tx.items.reduce((sum, i) => sum + i.baseForBonus, 0);
      const bonus = tx.items.reduce((sum, i) => sum + i.bonus, 0);
      return {
        transactionNumber: tx.transactionNumber,
        date: tx.date,
        itemsTotal: tx.itemsTotal,
        handlingTotal: tx.handlingTotal,
        net: bonusBase,
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
    const variants = accessCodeMatchVariants(accessCode);
    if (variants.length === 0) return null;
    const { data, error } = await supabase
      .from("users")
      .select("logged_in_device_id")
      .in("access_code", variants)
      .maybeSingle();

    if (error) throw error;
    return data?.logged_in_device_id ?? null;
  },

  /**
   * Lock the access code to this device in Supabase.
   */
  async lockDeviceInCloud(accessCode: string, deviceId: string): Promise<void> {
    const variants = accessCodeMatchVariants(accessCode);
    if (variants.length === 0) return;
    const { error } = await supabase
      .from("users")
      .update({ logged_in_device_id: deviceId })
      .in("access_code", variants);

    if (error) throw error;
  },

  /**
   * Unlock the access code from this device in Supabase (on logout).
   */
  async unlockDeviceInCloud(accessCode: string): Promise<void> {
    const variants = accessCodeMatchVariants(accessCode);
    if (variants.length === 0) return;
    const { error } = await supabase
      .from("users")
      .update({ logged_in_device_id: null })
      .in("access_code", variants);

    if (error) throw error;
  },

  /**
   * Update local DB to reflect the device lock.
   * Uses access_code so it works when local id differs from Supabase id.
   */
  async setLocalDeviceLock(
    accessCode: string,
    deviceId: string | null
  ): Promise<void> {
    const variants = accessCodeMatchVariants(accessCode);
    if (variants.length === 0) return;
    const db = await getDatabase();
    const ph = variants.map(() => "?").join(", ");
    await db.runAsync(
      `UPDATE users SET logged_in_device_id = ? WHERE access_code IN (${ph})`,
      [deviceId, ...variants]
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
    allowance: row.allowance ?? 0,
  };
}
