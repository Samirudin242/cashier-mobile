import { getDatabase } from '../client';
import { CREATE_TABLES_SQL } from '../schema/tables';
import { SEED_USERS_SQL, SEED_CATEGORIES_SQL, SEED_PRODUCTS_SQL } from '../schema/seed';

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(SEED_USERS_SQL);
  await db.execAsync(SEED_CATEGORIES_SQL);
  await db.execAsync(SEED_PRODUCTS_SQL);
  await runMigrations(db);
}

async function runMigrations(db: Awaited<ReturnType<typeof getDatabase>>) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(users)"
  );
  if (!columns.some((c) => c.name === 'logged_in_device_id')) {
    await db.execAsync('ALTER TABLE users ADD COLUMN logged_in_device_id TEXT');
  }
  if (!columns.some((c) => c.name === 'daily_salary')) {
    await db.execAsync('ALTER TABLE users ADD COLUMN daily_salary REAL NOT NULL DEFAULT 0');
  }
}
