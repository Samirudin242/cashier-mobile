import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppLoader } from './src/components/ui/AppLoader';
import { initializeDatabase } from './src/database/sqlite/migrations/initialize';
import { useAuthStore } from './src/stores/authStore';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const { isLoading, isAuthBusy, initialize } = useAuthStore();

  useEffect(() => {
    (async () => {
      await initializeDatabase();
      setDbReady(true);
      await initialize();
    })();
  }, []);

  const showLoader = !dbReady || isLoading;
  const loaderMessage = 'Memuat Kasir POS...';

  if (showLoader) {
    return (
      <SafeAreaProvider>
        <AppLoader message={loaderMessage} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
