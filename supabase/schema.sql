-- ============================================================
-- Cashier POS — Supabase Cloud Tables
-- Run this in Supabase SQL Editor to create all required tables.
-- ============================================================

-- Drop existing tables if you want a fresh start (uncomment if needed):
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS transaction_items CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ========================
-- USERS
-- ========================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  access_code text NOT NULL UNIQUE,
  store_id text NOT NULL DEFAULT 'default_store',
  daily_salary numeric NOT NULL DEFAULT 0,
  bonus_percent numeric NOT NULL DEFAULT 10,
  allowance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  logged_in_device_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed users (same as local SQLite seed)
INSERT INTO users (id, name, role, access_code, store_id, is_active, daily_salary, bonus_percent, created_at)
VALUES
  ('usr_owner_001',    'Pemilik Toko',   'owner',    'OWNER2024',  'default_store', true, 0,     0,  '2024-01-01T00:00:00.000Z'),
  ('usr_employee_001', 'Kasir Satu',     'employee', 'KASIR001',   'default_store', true, 75000, 10, '2024-01-01T00:00:00.000Z'),
  ('usr_employee_002', 'Kasir Dua',      'employee', 'KASIR002',   'default_store', true, 75000, 10, '2024-01-01T00:00:00.000Z'),
  ('usr_employee_003', 'Kasir Tiga',     'employee', 'KASIR003',   'default_store', true, 75000, 10, '2024-01-01T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- PRODUCTS
-- ========================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  handling_fee numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  device_id text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- TRANSACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL UNIQUE,
  customer_id text,
  customer_name text,
  customer_whatsapp text,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text,
  transaction_date timestamptz NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  device_id text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- TRANSACTION ITEMS
-- ========================
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id),
  product_name text NOT NULL,
  product_price numeric NOT NULL,
  cost_price numeric NOT NULL DEFAULT 0,
  handling_fee numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL,
  subtotal numeric NOT NULL
);

-- Migration: add cost_price to existing transaction_items tables
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;

-- ========================
-- CUSTOMERS
-- ========================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  address text,
  total_transactions integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  device_id text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- ATTENDANCE
-- ========================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  date text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'present',
  is_deleted boolean NOT NULL DEFAULT false,
  device_id text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- CATEGORIES
-- ========================
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed categories (same as local SQLite seed)
INSERT INTO categories (id, name, sort_order, created_at)
VALUES
  ('cat_001', 'Oli & Pelumas',   1, '2024-01-01T00:00:00.000Z'),
  ('cat_002', 'Rem',             2, '2024-01-01T00:00:00.000Z'),
  ('cat_003', 'Filter',          3, '2024-01-01T00:00:00.000Z'),
  ('cat_004', 'Kelistrikan',     4, '2024-01-01T00:00:00.000Z'),
  ('cat_005', 'Ban & Velg',      5, '2024-01-01T00:00:00.000Z'),
  ('cat_006', 'Rantai & Gear',   6, '2024-01-01T00:00:00.000Z'),
  ('cat_007', 'Jasa',            7, '2024-01-01T00:00:00.000Z'),
  ('cat_008', 'Umum',            8, '2024-01-01T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- INDEXES
-- ========================
-- ========================
-- RPC FUNCTIONS
-- ========================

-- Aggregated transaction summary for a date range (used by Reports screen).
-- Run this in Supabase SQL Editor if not yet created.
CREATE OR REPLACE FUNCTION get_transaction_summary(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (
  total_transaksi        bigint,
  total_pendapatan       numeric,
  total_modal            numeric,
  total_laba             numeric,
  total_biaya_penanganan numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(DISTINCT t.id)::bigint,
    COALESCE(SUM(ti.product_price * ti.quantity), 0),
    COALESCE(SUM(COALESCE(ti.cost_price, 0) * ti.quantity), 0),
    COALESCE(SUM((ti.product_price - COALESCE(ti.cost_price, 0)) * ti.quantity), 0),
    COALESCE(SUM(COALESCE(ti.handling_fee, 0) * ti.quantity), 0)
  FROM transactions t
  JOIN transaction_items ti ON ti.transaction_id = t.id
  WHERE t.is_deleted = FALSE
    AND t.transaction_date >= p_start
    AND t.transaction_date < p_end;
$$;

-- ========================
-- INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
