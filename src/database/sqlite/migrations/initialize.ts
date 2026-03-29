import { getDatabase } from "../client";
import { CREATE_TABLES_SQL } from "../schema/tables";

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(CREATE_TABLES_SQL);
  await runMigrations(db);
}

async function runMigrations(db: Awaited<ReturnType<typeof getDatabase>>) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(users)"
  );
  if (!columns.some((c) => c.name === "logged_in_device_id")) {
    await db.execAsync("ALTER TABLE users ADD COLUMN logged_in_device_id TEXT");
  }
  if (!columns.some((c) => c.name === "daily_salary")) {
    await db.execAsync(
      "ALTER TABLE users ADD COLUMN daily_salary REAL NOT NULL DEFAULT 0"
    );
  }

  if (!columns.some((c) => c.name === "bonus_percent")) {
    await db.execAsync(
      "ALTER TABLE users ADD COLUMN bonus_percent REAL NOT NULL DEFAULT 10"
    );
  }
  if (!columns.some((c) => c.name === "allowance")) {
    await db.execAsync(
      "ALTER TABLE users ADD COLUMN allowance REAL NOT NULL DEFAULT 0"
    );
  }

  // Add handling_fee to products if missing
  const prodCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(products)"
  );
  if (!prodCols.some((c) => c.name === "handling_fee")) {
    await db.execAsync(
      "ALTER TABLE products ADD COLUMN handling_fee REAL NOT NULL DEFAULT 0"
    );
  }

  // Add handling_fee to transaction_items if missing
  const tiCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(transaction_items)"
  );
  if (!tiCols.some((c) => c.name === "handling_fee")) {
    await db.execAsync(
      "ALTER TABLE transaction_items ADD COLUMN handling_fee REAL NOT NULL DEFAULT 0"
    );
  }

  await db.execAsync(
    "UPDATE users SET daily_salary = 75000 WHERE role = 'employee' AND daily_salary = 0"
  );
}
