import { supabase } from '../../config/supabase';
import { productRepository } from '../../repositories/productRepository';
import { transactionRepository } from '../../repositories/transactionRepository';
import { customerRepository } from '../../repositories/customerRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { syncRepository } from '../../repositories/syncRepository';

interface SyncResult {
  uploaded: number;
  failed: number;
  errors: string[];
}

export async function uploadSync(): Promise<SyncResult> {
  const result: SyncResult = { uploaded: 0, failed: 0, errors: [] };

  await uploadProducts(result);
  await uploadTransactions(result);
  await uploadCustomers(result);
  await uploadAttendance(result);

  return result;
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

async function uploadTransactions(result: SyncResult) {
  const pending = await transactionRepository.getPendingSync();

  for (const txn of pending) {
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
        cloudId = data.id;
      }

      await transactionRepository.markSynced(txn.local_id, cloudId!);
      await syncRepository.logEntry({
        entity_type: 'transactions',
        entity_local_id: txn.local_id,
        action: 'upload',
        status: 'success',
        error_message: null,
      });
      result.uploaded++;
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
}

async function uploadCustomers(result: SyncResult) {
  const pending = await customerRepository.getPendingSync();

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
