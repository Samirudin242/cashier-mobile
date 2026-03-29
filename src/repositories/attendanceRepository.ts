import { getDatabase } from "../database/sqlite/client";
import { Attendance, SyncStatus } from "../types";
import { generateLocalId, nowISO } from "../utils/helpers";

/**
 * Map cloud/other-device employee_id to this device's users.id so salary/absensi queries match.
 */
async function resolveLocalEmployeeId(
  employeeIdFromCloud: string,
  employeeName: string
): Promise<string> {
  const db = await getDatabase();
  const direct = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM users WHERE id = ?",
    [employeeIdFromCloud]
  );
  if (direct) return direct.id;

  const name = (employeeName ?? "").trim();
  if (!name) return employeeIdFromCloud;

  const matches = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM users WHERE role = 'employee' AND is_active = 1 AND TRIM(name) = ? COLLATE NOCASE",
    [name]
  );
  if (matches.length === 1) return matches[0].id;
  return employeeIdFromCloud;
}

export const attendanceRepository = {
  async getAll(limit = 50): Promise<Attendance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM attendance WHERE is_deleted = 0 ORDER BY date DESC, clock_in DESC LIMIT ?",
      [limit]
    );
    return rows.map(mapRow);
  },

  async getByDate(date: string): Promise<Attendance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM attendance WHERE is_deleted = 0 AND date = ? ORDER BY clock_in ASC",
      [date]
    );
    return rows.map(mapRow);
  },

  async getByEmployee(employeeId: string, limit = 30): Promise<Attendance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM attendance WHERE is_deleted = 0 AND employee_id = ? ORDER BY date DESC LIMIT ?",
      [employeeId, limit]
    );
    return rows.map(mapRow);
  },

  async clockIn(data: {
    employee_id: string;
    employee_name: string;
    date: string;
    notes?: string;
    status?: "present" | "late";
    device_id: string;
  }): Promise<Attendance> {
    const db = await getDatabase();
    const now = nowISO();
    const localId = generateLocalId();

    await db.runAsync(
      `INSERT INTO attendance (local_id, employee_id, employee_name, clock_in, date, notes, status, sync_status, created_at_local, updated_at_local, device_id, created_by, updated_by, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_upload', ?, ?, ?, ?, ?, 0)`,
      [
        localId,
        data.employee_id,
        data.employee_name,
        now,
        data.date,
        data.notes ?? null,
        data.status ?? "present",
        now,
        now,
        data.device_id,
        data.employee_id,
        data.employee_id,
      ]
    );

    return (await this.getById(localId))!;
  },

  async clockOut(localId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      "UPDATE attendance SET clock_out = ?, updated_at_local = ?, sync_status = 'pending_upload' WHERE local_id = ?",
      [now, now, localId]
    );
  },

  async getById(localId: string): Promise<Attendance | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM attendance WHERE local_id = ?",
      [localId]
    );
    return row ? mapRow(row) : null;
  },

  async getTodayForEmployee(employeeId: string): Promise<Attendance | null> {
    const db = await getDatabase();
    const today = new Date().toISOString().split("T")[0];
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND is_deleted = 0",
      [employeeId, today]
    );
    return row ? mapRow(row) : null;
  },

  async getPendingSync(): Promise<Attendance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM attendance WHERE sync_status IN ('pending_upload', 'pending_delete', 'failed')"
    );
    return rows.map(mapRow);
  },

  async markSynced(localId: string, cloudId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE attendance SET sync_status = 'synced', cloud_id = ?, last_synced_at = ?, sync_error = NULL WHERE local_id = ?",
      [cloudId, nowISO(), localId]
    );
  },

  async markFailed(localId: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE attendance SET sync_status = 'failed', sync_error = ? WHERE local_id = ?",
      [error, localId]
    );
  },

  async upsertFromCloud(data: any, deviceId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    const resolvedEmployeeId = await resolveLocalEmployeeId(
      String(data.employee_id ?? ""),
      String(data.employee_name ?? "")
    );

    let existing = await db.getFirstAsync<any>(
      "SELECT * FROM attendance WHERE cloud_id = ?",
      [data.id]
    );
    if (!existing) {
      existing = await db.getFirstAsync<any>(
        `SELECT * FROM attendance
         WHERE cloud_id IS NULL
         AND date(date) = date(?)
         AND (employee_id = ? OR employee_id = ?)`,
        [data.date, data.employee_id, resolvedEmployeeId]
      );
    }

    if (existing) {
      await db.runAsync(
        `UPDATE attendance SET cloud_id = ?, employee_id = ?, employee_name = ?, clock_in = ?, clock_out = ?, date = ?, notes = ?, status = ?, sync_status = 'synced', last_synced_at = ?, updated_at_local = ? WHERE local_id = ?`,
        [
          data.id,
          resolvedEmployeeId,
          data.employee_name,
          data.clock_in,
          data.clock_out,
          data.date,
          data.notes,
          data.status,
          now,
          now,
          existing.local_id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO attendance (local_id, cloud_id, employee_id, employee_name, clock_in, clock_out, date, notes, status, sync_status, created_at_local, updated_at_local, last_synced_at, device_id, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, 0)`,
        [
          generateLocalId(),
          data.id,
          resolvedEmployeeId,
          data.employee_name,
          data.clock_in,
          data.clock_out,
          data.date,
          data.notes,
          data.status,
          data.created_at || now,
          now,
          now,
          deviceId,
          data.created_by || "",
          data.updated_by || "",
        ]
      );
    }
  },

  async getMonthSummary(
    employeeId: string,
    year: number,
    month: number
  ): Promise<{ present: number; late: number; absent: number; leave: number }> {
    const db = await getDatabase();
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const rows = await db.getAllAsync<any>(
      "SELECT status, COUNT(*) as count FROM attendance WHERE employee_id = ? AND date LIKE ? AND is_deleted = 0 GROUP BY status",
      [employeeId, `${prefix}%`]
    );
    const result = { present: 0, late: 0, absent: 0, leave: 0 };
    for (const row of rows) {
      if (row.status in result) {
        (result as any)[row.status] = row.count;
      }
    }
    return result;
  },
};

function mapRow(row: any): Attendance {
  return {
    local_id: row.local_id,
    cloud_id: row.cloud_id,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    clock_in: row.clock_in,
    clock_out: row.clock_out,
    date: row.date,
    notes: row.notes,
    status: row.status,
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
