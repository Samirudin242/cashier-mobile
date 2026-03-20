export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  store_id TEXT NOT NULL DEFAULT 'default_store',
  is_active INTEGER NOT NULL DEFAULT 1,
  daily_salary REAL NOT NULL DEFAULT 0,
  bonus_percent REAL NOT NULL DEFAULT 10,
  logged_in_device_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  handling_fee REAL NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  transaction_number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_name TEXT,
  customer_whatsapp TEXT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  transaction_date TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transaction_items (
  local_id TEXT PRIMARY KEY,
  transaction_local_id TEXT NOT NULL,
  product_local_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  handling_fee REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (transaction_local_id) REFERENCES transactions(local_id)
);

CREATE TABLE IF NOT EXISTS customers (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  address TEXT,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_spent REAL NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT,
  date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'present',
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll_cache (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  total_days_worked INTEGER NOT NULL DEFAULT 0,
  total_late INTEGER NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  bonuses REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS salary_slip_metadata (
  local_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  payroll_local_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  period TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  sent_via_whatsapp INTEGER NOT NULL DEFAULT 0,
  whatsapp_number TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending_upload',
  sync_error TEXT,
  created_at_local TEXT NOT NULL,
  updated_at_local TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_local_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sync ON products(sync_status);
CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(sync_status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_customers_sync ON customers(sync_status);
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON attendance(sync_status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_payroll_sync ON payroll_cache(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_access_code ON users(access_code);
`;
