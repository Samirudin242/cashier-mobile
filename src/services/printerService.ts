/**
 * Bluetooth thermal printer service for ESC/POS 58mm printers (e.g. EPPOS RPP02).
 * Uses react-native-thermal-pos-printer for Bluetooth connectivity.
 * Lazy-loads native module to avoid crash in Expo Go / when not built with native code.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

const NOT_AVAILABLE_MSG =
  'Printer Bluetooth tidak tersedia. Jalankan dengan development build: npx expo run:android';

type PrinterModule = typeof import('react-native-thermal-pos-printer').default;
let _printerModule: PrinterModule | false | null = null;

function getPrinterModule(): PrinterModule {
  if (_printerModule === null) {
    try {
      const mod = require('react-native-thermal-pos-printer');
      _printerModule = mod.default;
    } catch {
      _printerModule = false;
    }
  }
  if (!_printerModule) {
    throw new Error(NOT_AVAILABLE_MSG);
  }
  return _printerModule;
}

export type ThermalPrinterDevice = import('react-native-thermal-pos-printer').ThermalPrinterDevice;
import { formatCurrency, formatDateTime } from '../utils/helpers';
import type { Transaction, TransactionItem } from '../types';

const PRINTER_STORAGE_KEY = '@cashier/printer_address';

/** Receipt line width for 58mm paper (chars) */
const RECEIPT_WIDTH = 32;

let initialized = false;

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const ReactNativePosPrinter = getPrinterModule();
  await ReactNativePosPrinter.init();
  initialized = true;
}

/** Request Bluetooth permissions on Android */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const apiLevel = Platform.Version as number;
    if (apiLevel >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/** Get available Bluetooth printers (paired devices). Pair EPPOS RPP02 in Android Bluetooth settings first. */
export async function getAvailablePrinters(): Promise<ThermalPrinterDevice[]> {
  await ensureInit();
  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) {
    throw new Error('Izin Bluetooth diperlukan. Aktifkan di Pengaturan.');
  }
  const ReactNativePosPrinter = getPrinterModule();
  const devices = await ReactNativePosPrinter.getDeviceList();
  return devices.filter((d) => d.getType() === 'BLUETOOTH');
}

/** Connect to printer by address */
export async function connectPrinter(address: string): Promise<ThermalPrinterDevice> {
  await ensureInit();
  const ReactNativePosPrinter = getPrinterModule();
  const device = await ReactNativePosPrinter.connectPrinter(address, {
    type: 'BLUETOOTH',
    encoding: 'UTF-8',
  });
  await AsyncStorage.setItem(PRINTER_STORAGE_KEY, address);
  return device;
}

/** Get last used printer address */
export async function getLastPrinterAddress(): Promise<string | null> {
  return AsyncStorage.getItem(PRINTER_STORAGE_KEY);
}

/** Clear saved printer */
export async function clearSavedPrinter(): Promise<void> {
  await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
}

/** Check if currently connected to a printer */
export async function isPrinterConnected(): Promise<boolean> {
  try {
    await ensureInit();
    const ReactNativePosPrinter = getPrinterModule();
    return await ReactNativePosPrinter.isConnected();
  } catch {
    return false;
  }
}

/** Disconnect from printer */
export async function disconnectPrinter(): Promise<void> {
  try {
    const ReactNativePosPrinter = getPrinterModule();
    await ReactNativePosPrinter.disconnectPrinter();
  } catch {
    // ignore
  }
}

export interface ReceiptData {
  transactionNumber: string;
  transactionDate: string;
  items: { product_name: string; quantity: number; product_price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  employeeName: string;
  customerName?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
};

/** Build receipt payload from a stored transaction + line items */
export function buildReceiptData(
  transaction: Transaction,
  items: TransactionItem[]
): ReceiptData {
  const paymentMethod =
    PAYMENT_LABELS[transaction.payment_method] ?? transaction.payment_method;
  return {
    transactionNumber: transaction.transaction_number,
    transactionDate: formatDateTime(transaction.transaction_date),
    items: items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      product_price: i.product_price,
      subtotal: i.subtotal,
    })),
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: transaction.tax,
    total: transaction.total,
    paymentMethod,
    employeeName: transaction.employee_name,
    customerName: transaction.customer_name ?? undefined,
  };
}

/** Format text to fit 58mm receipt (truncate/wrap) */
function fitLine(text: string, maxLen = RECEIPT_WIDTH): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      lines.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, maxLen);
    const spaceIdx = chunk.lastIndexOf(' ');
    const breakAt = spaceIdx > maxLen / 2 ? spaceIdx : maxLen;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return lines;
}

/** Pad string for right-align (e.g. prices) */
function padRight(left: string, right: string, width = RECEIPT_WIDTH): string {
  const leftLen = left.length;
  const rightLen = right.length;
  if (leftLen + rightLen >= width) {
    return left.slice(0, width - rightLen - 1) + ' ' + right;
  }
  const spaces = width - leftLen - rightLen;
  return left + ' '.repeat(spaces) + right;
}

/** Print receipt to connected printer */
export async function printReceipt(data: ReceiptData): Promise<void> {
  await ensureInit();
  const ReactNativePosPrinter = getPrinterModule();
  const connected = await ReactNativePosPrinter.isConnected();
  if (!connected) {
    throw new Error('Printer tidak terhubung. Pilih printer terlebih dahulu.');
  }

  const sep = '-'.repeat(RECEIPT_WIDTH);

  await ReactNativePosPrinter.initializePrinter();
  await ReactNativePosPrinter.setAlignment('CENTER');
  await ReactNativePosPrinter.printText('STRUK PEMBAYARAN', { bold: true, size: 24 });
  await ReactNativePosPrinter.newLine(1);
  await ReactNativePosPrinter.printText(data.transactionNumber, { bold: true });
  await ReactNativePosPrinter.printText(data.transactionDate);
  await ReactNativePosPrinter.newLine(1);

  await ReactNativePosPrinter.setAlignment('LEFT');
  await ReactNativePosPrinter.printText(sep);

  for (const item of data.items) {
    const nameLines = fitLine(item.product_name, 20);
    const priceStr = formatCurrency(item.subtotal);
    for (let i = 0; i < nameLines.length; i++) {
      if (i === 0) {
        await ReactNativePosPrinter.printText(
          padRight(
            `${nameLines[0]} x${item.quantity}`,
            priceStr,
            RECEIPT_WIDTH
          )
        );
      } else {
        await ReactNativePosPrinter.printText(nameLines[i]);
      }
    }
  }

  await ReactNativePosPrinter.printText(sep);

  if (data.discount > 0) {
    await ReactNativePosPrinter.printText(
      padRight('Subtotal', formatCurrency(data.subtotal), RECEIPT_WIDTH)
    );
    await ReactNativePosPrinter.printText(
      padRight('Diskon', `-${formatCurrency(data.discount)}`, RECEIPT_WIDTH)
    );
  }
  if (data.tax > 0) {
    await ReactNativePosPrinter.printText(
      padRight('Pajak', formatCurrency(data.tax), RECEIPT_WIDTH)
    );
  }

  await ReactNativePosPrinter.setBold(true);
  await ReactNativePosPrinter.printText(
    padRight('TOTAL', formatCurrency(data.total), RECEIPT_WIDTH)
  );
  await ReactNativePosPrinter.setBold(false);

  await ReactNativePosPrinter.printText(sep);
  await ReactNativePosPrinter.printText(`Pembayaran: ${data.paymentMethod}`);
  await ReactNativePosPrinter.printText(`Kasir: ${data.employeeName}`);
  if (data.customerName) {
    await ReactNativePosPrinter.printText(`Pelanggan: ${data.customerName}`);
  }
  await ReactNativePosPrinter.newLine(1);

  await ReactNativePosPrinter.setAlignment('CENTER');
  await ReactNativePosPrinter.printText('Terima kasih!', { bold: true });
  await ReactNativePosPrinter.printText('Silakan datang kembali');
  await ReactNativePosPrinter.newLine(2);

  await ReactNativePosPrinter.cutPaper();
}
