export const SEED_USERS_SQL = `
INSERT OR IGNORE INTO users (id, name, role, access_code, store_id, is_active, daily_salary, created_at)
VALUES
  ('usr_owner_001',    'Pemilik Toko',   'owner',    'OWNER2024',  'default_store', 1, 0,      '2024-01-01T00:00:00.000Z'),
  ('usr_employee_001', 'Kasir Satu',     'employee', 'KASIR001',   'default_store', 1, 75000,  '2024-01-01T00:00:00.000Z'),
  ('usr_employee_002', 'Kasir Dua',      'employee', 'KASIR002',   'default_store', 1, 75000,  '2024-01-01T00:00:00.000Z'),
  ('usr_employee_003', 'Kasir Tiga',     'employee', 'KASIR003',   'default_store', 1, 75000,  '2024-01-01T00:00:00.000Z');
`;

export const SEED_PRODUCTS_SQL = `
INSERT OR IGNORE INTO products (local_id, name, sku, price, cost_price, stock, category, is_active, sync_status, created_at_local, updated_at_local, device_id, created_by, updated_by, is_deleted)
VALUES
  ('prd_001', 'Oli Mesin 1L (SAE 10W-40)',     'OLI-1040',   75000,  55000,  30, 'Oli & Pelumas',      1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_002', 'Kampas Rem Depan',               'KRM-DPN',    120000, 80000,  20, 'Rem',                1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_003', 'Filter Udara Universal',         'FLT-UDR',    45000,  25000,  25, 'Filter',             1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_004', 'Busi Iridium',                   'BSI-IRD',    65000,  40000,  40, 'Kelistrikan',        1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_005', 'Aki Motor 12V 5Ah',              'AKI-5AH',    185000, 140000, 10, 'Kelistrikan',        1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_006', 'Ban Luar 80/90-17',              'BAN-8090',   210000, 160000, 12, 'Ban & Velg',         1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_007', 'Rantai Motor 428H',              'RNT-428',    95000,  65000,  15, 'Rantai & Gear',      1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_008', 'Minyak Rem DOT-3 300ml',         'REM-DOT3',   28000,  18000,  35, 'Oli & Pelumas',      1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_009', 'Gear Set (Depan + Belakang)',     'GRS-SET',    155000, 110000, 8,  'Rantai & Gear',      1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0),
  ('prd_010', 'Jasa Servis Ringan',             'JSA-SRV',    50000,  0,      999,'Jasa',               1, 'pending_upload', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'seed', 'usr_owner_001', 'usr_owner_001', 0);
`;
