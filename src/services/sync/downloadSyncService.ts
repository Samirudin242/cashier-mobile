import { supabase } from '../../config/supabase';
import { productRepository } from '../../repositories/productRepository';
import { transactionRepository } from '../../repositories/transactionRepository';
import { customerRepository } from '../../repositories/customerRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { userRepository } from '../../repositories/userRepository';
import { syncRepository } from '../../repositories/syncRepository';
import type { User } from '../../types';

interface DownloadResult {
  downloaded: number;
  failed: number;
  errors: string[];
}

export async function downloadSync(deviceId: string): Promise<DownloadResult> {
  const result: DownloadResult = { downloaded: 0, failed: 0, errors: [] };

  await downloadCategories(result);
  await downloadProducts(deviceId, result);
  await downloadUsers(result);
  await downloadTransactions(deviceId, result);
  await downloadTransactionItems(deviceId, result);
  await downloadCustomers(deviceId, result);
  await downloadAttendance(deviceId, result);

  return result;
}

async function downloadCategories(result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    for (const item of data ?? []) {
      try {
        await categoryRepository.upsertFromCloud(item);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Kategori ${item.name}: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'categories',
      entity_local_id: 'batch',
      action: 'download',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh kategori: ${err.message}`);
  }
}

async function downloadProducts(deviceId: string, result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    for (const item of data ?? []) {
      try {
        await productRepository.upsertFromCloud(item, deviceId);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Produk ${item.name}: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'products',
      entity_local_id: 'batch',
      action: 'download',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh produk: ${err.message}`);
  }
}

async function downloadUsers(result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, access_code, store_id, is_active, daily_salary, bonus_percent')
      .order('name', { ascending: true });

    if (error) throw error;

    for (const row of data ?? []) {
      try {
        const user: User = {
          id: row.id,
          name: row.name,
          role: row.role,
          access_code: row.access_code,
          store_id: row.store_id ?? 'default_store',
          is_active: !!row.is_active,
          daily_salary: row.daily_salary ?? 0,
          bonus_percent: row.bonus_percent ?? 10,
        };
        await userRepository.upsertUserToLocal(user);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Pengguna ${row.name}: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'users',
      entity_local_id: 'batch',
      action: 'download',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh pengguna: ${err.message}`);
  }
}

async function downloadTransactions(deviceId: string, result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(500);

    if (error) throw error;

    for (const item of data ?? []) {
      try {
        await transactionRepository.upsertFromCloud(item, deviceId);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Transaksi ${item.transaction_number}: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'transactions',
      entity_local_id: 'batch',
      action: 'download',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh transaksi: ${err.message}`);
  }
}

async function downloadTransactionItems(_deviceId: string, result: DownloadResult) {
  try {
    const { data: items, error } = await supabase
      .from('transaction_items')
      .select('*')
      .order('transaction_id', { ascending: true });

    if (error) throw error;

    const byTransaction = new Map<string, typeof items>();
    for (const item of items ?? []) {
      const tid = item.transaction_id;
      if (!byTransaction.has(tid)) byTransaction.set(tid, []);
      byTransaction.get(tid)!.push(item);
    }

    for (const [cloudTransactionId, cloudItems] of byTransaction) {
      try {
        const localId = await transactionRepository.getLocalIdByCloudId(cloudTransactionId);
        if (!localId) continue;

        const formatted = cloudItems.map((i: any) => ({
          product_name: i.product_name,
          product_price: i.product_price,
          handling_fee: i.handling_fee ?? 0,
          quantity: i.quantity,
          subtotal: i.subtotal,
        }));
        await transactionRepository.replaceItemsFromCloud(localId, formatted);
        result.downloaded += cloudItems.length;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Item transaksi: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'transaction_items',
      entity_local_id: 'batch',
      action: 'download',
      status: 'success',
      error_message: null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh item transaksi: ${err.message}`);
  }
}

async function downloadCustomers(deviceId: string, result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    for (const item of data ?? []) {
      try {
        await customerRepository.upsertFromCloud(item, deviceId);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Pelanggan ${item.name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh pelanggan: ${err.message}`);
  }
}

async function downloadAttendance(deviceId: string, result: DownloadResult) {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false })
      .limit(500);

    if (error) throw error;

    for (const item of data ?? []) {
      try {
        await attendanceRepository.upsertFromCloud(item, deviceId);
        result.downloaded++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Absensi ${item.employee_name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Unduh absensi: ${err.message}`);
  }
}
