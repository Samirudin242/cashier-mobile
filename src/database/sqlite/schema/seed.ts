export const SEED_USERS_SQL = `
INSERT OR IGNORE INTO users (id, name, role, access_code, store_id, is_active, created_at)
VALUES
  ('usr_owner_001',    'Pemilik Toko',   'owner',    'OWNER2024',  'default_store', 1, '2024-01-01T00:00:00.000Z'),
  ('usr_employee_001', 'Kasir Satu',     'employee', 'KASIR001',   'default_store', 1, '2024-01-01T00:00:00.000Z'),
  ('usr_employee_002', 'Kasir Dua',      'employee', 'KASIR002',   'default_store', 1, '2024-01-01T00:00:00.000Z'),
  ('usr_employee_003', 'Kasir Tiga',     'employee', 'KASIR003',   'default_store', 1, '2024-01-01T00:00:00.000Z');
`;
