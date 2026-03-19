import { supabase } from '../../config/supabase';
import { productRepository } from '../../repositories/productRepository';
import { transactionRepository } from '../../repositories/transactionRepository';
import { customerRepository } from '../../repositories/customerRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { syncRepository } from '../../repositories/syncRepository';

interface DownloadResult {
  downloaded: number;
  failed: number;
  errors: string[];
}

export async function downloadSync(deviceId: string): Promise<DownloadResult> {
  const result: DownloadResult = { downloaded: 0, failed: 0, errors: [] };

  await downloadProducts(deviceId, result);
  await downloadTransactions(deviceId, result);
  await downloadCustomers(deviceId, result);
  await downloadAttendance(deviceId, result);

  return result;
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
        result.errors.push(`Product ${item.name}: ${err.message}`);
      }
    }

    await syncRepository.logEntry({
      entity_type: 'products',
      entity_local_id: 'batch',
      action: 'download',
      status: result.failed === 0 ? 'success' : 'failed',
      error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
    });
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Products download: ${err.message}`);
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
        result.errors.push(`Transaction ${item.transaction_number}: ${err.message}`);
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
    result.errors.push(`Transactions download: ${err.message}`);
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
        result.errors.push(`Customer ${item.name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Customers download: ${err.message}`);
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
        result.errors.push(`Attendance ${item.employee_name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Attendance download: ${err.message}`);
  }
}
