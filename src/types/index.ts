export type SyncStatus =
  | 'pending_upload'
  | 'synced'
  | 'failed'
  | 'pending_delete'
  | 'conflict';

export type UserRole = 'owner' | 'employee';

export interface SyncFields {
  local_id: string;
  cloud_id: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  created_at_local: string;
  updated_at_local: string;
  last_synced_at: string | null;
  device_id: string;
  created_by: string;
  updated_by: string;
  is_deleted: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  access_code: string;
  store_id: string;
  is_active: boolean;
  daily_salary: number;
  bonus_percent: number;
  /** Fixed monthly allowance (tunjangan), added once per salary period. */
  allowance: number;
}

export interface EmployeeSalary {
  employee: User;
  daysWorked: number;
  daysLate: number;
  baseSalary: number;
  bonus: number;
  totalSalary: number;
  periodStart: string;
  periodEnd: string;
  transactions: {
    transactionNumber?: string;
    date: string;
    itemsTotal: number;
    handlingTotal: number;
    /** Sum of per-item ((jual−modal)−penanganan)×qty before bonus % */
    net: number;
    bonus: number;
    items?: { productName: string; baseForBonus: number; quantity: number; bonus: number }[];
  }[];
  attendanceDetails: { date: string; status: string; clockIn: string; clockOut: string | null }[];
}

export interface Product extends SyncFields {
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  handling_fee: number;
  stock: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
}

export interface Transaction extends SyncFields {
  transaction_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_whatsapp: string | null;
  employee_id: string;
  employee_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'qris';
  notes: string | null;
  transaction_date: string;
}

export interface TransactionItem {
  local_id: string;
  transaction_local_id: string;
  product_local_id: string;
  product_name: string;
  product_price: number;
  handling_fee: number;
  quantity: number;
  subtotal: number;
}

export interface Customer extends SyncFields {
  name: string;
  whatsapp: string;
  email: string | null;
  address: string | null;
  total_transactions: number;
  total_spent: number;
}

export interface Attendance extends SyncFields {
  employee_id: string;
  employee_name: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
  notes: string | null;
  status: 'present' | 'late' | 'absent' | 'leave';
}

export interface PayrollCache extends SyncFields {
  employee_id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  total_days_worked: number;
  total_late: number;
  deductions: number;
  bonuses: number;
  net_salary: number;
}

export interface SalarySlipMetadata extends SyncFields {
  payroll_local_id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  generated_at: string;
  sent_via_whatsapp: boolean;
  whatsapp_number: string | null;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SyncLogEntry {
  id: string;
  entity_type: string;
  entity_local_id: string;
  action: 'upload' | 'download';
  status: 'success' | 'failed';
  error_message: string | null;
  timestamp: string;
}

export interface SyncSummary {
  lastSyncTime: string | null;
  pendingUpload: number;
  failedUpload: number;
  totalSynced: number;
}
