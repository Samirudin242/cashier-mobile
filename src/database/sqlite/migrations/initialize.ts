import { getDatabase } from '../client';
import { CREATE_TABLES_SQL } from '../schema/tables';
import { SEED_USERS_SQL } from '../schema/seed';

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(SEED_USERS_SQL);
  await runMigrations(db);
}

async function runMigrations(db: Awaited<ReturnType<typeof getDatabase>>) {
  // Add logged_in_device_id to users table if missing (added after initial schema)
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(users)"
  );
  const hasDeviceCol = columns.some((c) => c.name === 'logged_in_device_id');
  if (!hasDeviceCol) {
    await db.execAsync(
      'ALTER TABLE users ADD COLUMN logged_in_device_id TEXT'
    );
  }
}
