import { getDatabase } from '../client';
import { CREATE_TABLES_SQL } from '../schema/tables';
import { SEED_USERS_SQL } from '../schema/seed';

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(SEED_USERS_SQL);
}
