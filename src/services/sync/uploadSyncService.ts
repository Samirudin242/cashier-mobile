import { supabase } from '../../config/supabase';
import { productRepository } from '../../repositories/productRepository';
import { transactionRepository } from '../../repositories/transactionRepository';
import { customerRepository } from '../../repositories/customerRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { userRepository } from '../../repositories/userRepository';
import { syncRepository } from '../../repositories/syncRepository';
import { isGoogleSheetsConfigured } from '../../config/googleSheets';
import { appendRowsToGoogleSheet, type SheetRow } from '../googleSheetsAppendService';

export interface SyncResult {
  uploaded: number;
  failed: number;
  errors: string[];
}

export type UploadEntityType =
  | 'categories'
  | 'products'
  | 'users'
  | 'transactions'
  | 'customers'
  | 'attendance';

/** Ordered list for UI (same order as a full sync: categories before products, etc.). */
export const UPLOAD_TYPE_OPTIONS: { id: UploadEntityType; label: string }[] = [
  { id: 'categories', label: 'Kategori' },
  { id: 'products', label: 'Produk' },
  { id: 'users', label: 'Karyawan' },
  { id: 'transactions', label: 'Transaksi' },
  { id: 'customers', label: 'Pelanggan' },
  { id: 'attendance', label: 'Absensi' },
];

export async function uploadSync(types: UploadEntityType[]): Promise<SyncResult> {
  const result: SyncResult = { uploaded: 0, failed: 0, errors: [] };
  const include = (t: UploadEntityType) => types.includes(t);

  if (include('categories')) await uploadCategories(result);
  if (include('products')) await uploadProducts(result);
  if (include('users')) await uploadUsers(result);
  if (include('transactions')) await uploadTransactions(result);
  if (include('customers')) await uploadCustomers(result);
  if (include('attendance')) await uploadAttendance(result);

  return result;
}

async function uploadCategories(result: SyncResult) {
  try {
    const categories = await categoryRepository.getAll();
    for (const cat of categories) {
      // Supabase has UNIQUE on `name`. Upsert on `id` alone fails when the same name
      // already exists with another id (e.g. seed on cloud vs local). Match by name first.
      const { data: byName, error: selErr } = await supabase
        .from('categories')
        .select('id')
        .eq('name', cat.name)
        .maybeSingle();
      if (selErr) throw selErr;

      if (byName) {
        const { error } = await supabase
          .from('categories')
          .update({ sort_order: cat.sort_order })
          .eq('id', byName.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            id: cat.id,
            name: cat.name,
            sort_order: cat.sort_order,
            created_at: cat.created_at,
          });
        if (error) throw error;
      }
      result.uploaded++;
    }
    await syncRepository.logEntry({
      entity_type: 'categories',
      entity_local_id: 'batch',
      action: 'upload',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    const msg = err?.message || 'Kesalahan tidak diketahui';
    result.failed++;
    result.errors.push(`Kategori: ${msg}`);
    await syncRepository.logEntry({
      entity_type: 'categories',
      entity_local_id: 'batch',
      action: 'upload',
      status: 'failed',
      error_message: msg,
    });
  }
}

async function uploadProducts(result: SyncResult) {
  const pending = await productRepository.getPendingSync();

  for (const product of pending) {
    try {
      const payload = {
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost_price: product.cost_price,
        handling_fee: product.handling_fee,
        stock: product.stock,
        category: product.category,
        is_active: !!product.is_active,
        is_deleted: !!product.is_deleted,
        device_id: product.device_id,
        created_by: product.created_by,
        updated_by: product.updated_by,
        created_at: product.created_at_local,
        updated_at: product.updated_at_local,
      };

      let cloudId = product.cloud_id;

      if (cloudId) {
        const { error } = await supabase.from('products').update(payload).eq('id', cloudId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        cloudId = data.id;
      }

      await productRepository.markSynced(product.local_id, cloudId!);
      await syncRepository.logEntry({
        entity_type: 'products',
        entity_local_id: product.local_id,
        action: 'upload',
        status: 'success',
        error_message: null,
      });
      result.uploaded++;
    } catch (err: any) {
      const msg = err?.message || 'Kesalahan tidak diketahui';
      await productRepository.markFailed(product.local_id, msg);
      await syncRepository.logEntry({
        entity_type: 'products',
        entity_local_id: product.local_id,
        action: 'upload',
        status: 'failed',
        error_message: msg,
      });
      result.failed++;
      result.errors.push(`Produk ${product.name}: ${msg}`);
    }
  }
}

async function uploadUsers(result: SyncResult) {
  try {
    const employees = await userRepository.getEmployees();
    for (const user of employees) {
      try {
        await userRepository.uploadUserToSupabase(user);
        result.uploaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Karyawan ${user.name}: ${err?.message || 'Gagal unggah'}`);
      }
    }
    if (employees.length > 0) {
      await syncRepository.logEntry({
        entity_type: 'users',
        entity_local_id: 'batch',
        action: 'upload',
        status: 'success',
        error_message: null,
      });
    }
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Karyawan: ${err?.message || 'Kesalahan tidak diketahui'}`);
  }
}

async function appendSheetRowsSafe(rows: SheetRow[], result: SyncResult, label: string) {
  if (rows.length === 0) return;
  if (!isGoogleSheetsConfigured()) return;
  try {
    await appendRowsToGoogleSheet(rows);
  } catch (err: any) {
    console.warn('[Google Sheets]', err);
    const msg = err?.message || 'Gagal mengirim ke Google Sheet';
    result.errors.push(`${label}: ${msg}`);
  }
}

async function uploadTransactions(result: SyncResult) {
  const pending = await transactionRepository.getPendingSync();
  const sheetRows: SheetRow[] = [];

  for (const txn of pending) {
    if (txn.sync_status === 'pending_delete') continue;

    try {
      const payload = {
        transaction_number: txn.transaction_number,
        customer_name: txn.customer_name,
        customer_whatsapp: txn.customer_whatsapp,
        employee_id: txn.employee_id,
        employee_name: txn.employee_name,
        subtotal: txn.subtotal,
        discount: txn.discount,
        tax: txn.tax,
        total: txn.total,
        payment_method: txn.payment_method,
        notes: txn.notes,
        transaction_date: txn.transaction_date,
        is_deleted: !!txn.is_deleted,
        device_id: txn.device_id,
        created_by: txn.created_by,
        updated_by: txn.updated_by,
        created_at: txn.created_at_local,
        updated_at: txn.updated_at_local,
      };

      let cloudId = txn.cloud_id;

      if (cloudId) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', cloudId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('transactions').insert(payload).select().single();
        if (error) throw error;
        cloudId = data?.id ?? null;
      }

      if (!cloudId) throw new Error('Failed to get transaction cloud ID');
      await uploadTransactionItems(txn.local_id, cloudId);
      await transactionRepository.markSynced(txn.local_id, cloudId);
      await syncRepository.logEntry({
        entity_type: 'transactions',
        entity_local_id: txn.local_id,
        action: 'upload',
        status: 'success',
        error_message: null,
      });
      result.uploaded++;

      const items = await transactionRepository.getItems(txn.local_id);
      const name = txn.customer_name?.trim() ?? '';
      const wa = txn.customer_whatsapp?.trim() ?? '';
      const num = txn.transaction_number;
      for (const item of items) {
        sheetRows.push([
          name || '-',
          wa || '-',
          num,
          `${item.product_name} × ${item.quantity}`,
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || 'Kesalahan tidak diketahui';
      await transactionRepository.markFailed(txn.local_id, msg);
      await syncRepository.logEntry({
        entity_type: 'transactions',
        entity_local_id: txn.local_id,
        action: 'upload',
        status: 'failed',
        error_message: msg,
      });
      result.failed++;
      result.errors.push(`Transaksi ${txn.transaction_number}: ${msg}`);
    }
  }

  await appendSheetRowsSafe(sheetRows, result, 'Google Sheet (transaksi)');
}

async function uploadTransactionItems(transactionLocalId: string, cloudTransactionId: string) {
  const items = await transactionRepository.getItems(transactionLocalId);

  await supabase
    .from('transaction_items')
    .delete()
    .eq('transaction_id', cloudTransactionId);

  if (items.length > 0) {
    const payloads = items.map((item) => ({
      transaction_id: cloudTransactionId,
      product_name: item.product_name,
      product_price: item.product_price,
      cost_price: item.cost_price ?? 0,
      handling_fee: item.handling_fee ?? 0,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));
    const { error } = await supabase.from('transaction_items').insert(payloads);
    if (error) throw error;
  }
}

async function uploadCustomers(result: SyncResult) {
  const pending = await customerRepository.getPendingSync();
  const sheetRows: SheetRow[] = [];

  for (const customer of pending) {
    try {
      const payload = {
        name: customer.name,
        whatsapp: customer.whatsapp,
        email: customer.email,
        address: customer.address,
        total_transactions: customer.total_transactions,
        total_spent: customer.total_spent,
        is_deleted: !!customer.is_deleted,
        device_id: customer.device_id,
        created_by: customer.created_by,
        updated_by: customer.updated_by,
        created_at: customer.created_at_local,
        updated_at: customer.updated_at_local,
      };

      let cloudId = customer.cloud_id;

      if (cloudId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', cloudId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('customers').insert(payload).select().single();
        if (error) throw error;
        cloudId = data.id;
      }

      await customerRepository.markSynced(customer.local_id, cloudId!);
      await syncRepository.logEntry({
        entity_type: 'customers',
        entity_local_id: customer.local_id,
        action: 'upload',
        status: 'success',
        error_message: null,
      });
      result.uploaded++;
      if (!customer.is_deleted) {
        sheetRows.push([
          customer.name,
          customer.whatsapp ?? '',
          customer.email ?? '',
          String(customer.total_spent ?? 0),
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || 'Kesalahan tidak diketahui';
      await customerRepository.markFailed(customer.local_id, msg);
      await syncRepository.logEntry({
        entity_type: 'customers',
        entity_local_id: customer.local_id,
        action: 'upload',
        status: 'failed',
        error_message: msg,
      });
      result.failed++;
      result.errors.push(`Pelanggan ${customer.name}: ${msg}`);
    }
  }

  await appendSheetRowsSafe(sheetRows, result, 'Google Sheet (pelanggan)');
}

async function uploadAttendance(result: SyncResult) {
  const pending = await attendanceRepository.getPendingSync();

  for (const attendance of pending) {
    try {
      const payload = {
        employee_id: attendance.employee_id,
        employee_name: attendance.employee_name,
        clock_in: attendance.clock_in,
        clock_out: attendance.clock_out,
        date: attendance.date,
        notes: attendance.notes,
        status: attendance.status,
        is_deleted: !!attendance.is_deleted,
        device_id: attendance.device_id,
        created_by: attendance.created_by,
        updated_by: attendance.updated_by,
        created_at: attendance.created_at_local,
        updated_at: attendance.updated_at_local,
      };

      let cloudId = attendance.cloud_id;

      if (cloudId) {
        const { error } = await supabase.from('attendance').update(payload).eq('id', cloudId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('attendance').insert(payload).select().single();
        if (error) throw error;
        cloudId = data.id;
      }

      await attendanceRepository.markSynced(attendance.local_id, cloudId!);
      await syncRepository.logEntry({
        entity_type: 'attendance',
        entity_local_id: attendance.local_id,
        action: 'upload',
        status: 'success',
        error_message: null,
      });
      result.uploaded++;
    } catch (err: any) {
      const msg = err?.message || 'Kesalahan tidak diketahui';
      await attendanceRepository.markFailed(attendance.local_id, msg);
      await syncRepository.logEntry({
        entity_type: 'attendance',
        entity_local_id: attendance.local_id,
        action: 'upload',
        status: 'failed',
        error_message: msg,
      });
      result.failed++;
      result.errors.push(`Absensi ${attendance.employee_name}: ${msg}`);
    }
  }
}
