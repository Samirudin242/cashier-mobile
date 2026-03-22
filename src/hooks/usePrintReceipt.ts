import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { ThermalPrinterDevice } from 'react-native-thermal-pos-printer';
import {
  getAvailablePrinters,
  getLastPrinterAddress,
  connectPrinter,
  isPrinterConnected,
  printReceipt,
  type ReceiptData,
} from '../services/printerService';

export function usePrintReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [devices, setDevices] = useState<ThermalPrinterDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const pendingReceiptRef = useRef<ReceiptData | null>(null);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const list = await getAvailablePrinters();
      setDevices(list);
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar printer';
      Alert.alert('Kesalahan', msg);
      return [];
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const closePicker = useCallback(() => {
    pendingReceiptRef.current = null;
    setShowPicker(false);
  }, []);

  const handlePrint = useCallback(
    async (data: ReceiptData) => {
      if (Platform.OS !== 'android') {
        Alert.alert('Tidak didukung', 'Cetak struk Bluetooth hanya tersedia di Android.');
        return;
      }

      setIsPrinting(true);
      try {
        let connected = await isPrinterConnected();
        if (!connected) {
          const lastAddr = await getLastPrinterAddress();
          if (lastAddr) {
            try {
              await connectPrinter(lastAddr);
              connected = await isPrinterConnected();
            } catch {
              // fall through to device picker
            }
          }
        }

        if (!connected) {
          const list = await loadDevices();
          if (list.length === 0) {
            Alert.alert(
              'Printer Tidak Ditemukan',
              'Pasangkan printer EPPOS RPP02 di Pengaturan → Bluetooth, lalu buka lagi Cetak Struk.',
              [{ text: 'OK' }]
            );
            return;
          }
          pendingReceiptRef.current = data;
          setShowPicker(true);
          return;
        }

        await printReceipt(data);
        Alert.alert('Berhasil', 'Struk berhasil dicetak.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mencetak struk';
        Alert.alert('Kesalahan', msg);
      } finally {
        setIsPrinting(false);
      }
    },
    [loadDevices]
  );

  const selectDeviceAndPrint = useCallback(async (device: ThermalPrinterDevice) => {
    const data = pendingReceiptRef.current;
    if (!data) return;

    setIsPrinting(true);
    try {
      await connectPrinter(device.getAddress());
      await printReceipt(data);
      pendingReceiptRef.current = null;
      setShowPicker(false);
      Alert.alert('Berhasil', 'Struk berhasil dicetak.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mencetak struk';
      Alert.alert('Kesalahan', msg);
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return {
    isPrinting,
    showPicker,
    devices,
    loadingDevices,
    loadDevices,
    closePicker,
    handlePrint,
    selectDeviceAndPrint,
  };
}
