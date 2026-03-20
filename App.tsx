import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppLoader } from './src/components/ui/AppLoader';
import { initializeDatabase } from './src/database/sqlite/migrations/initialize';
import { useAuthStore } from './src/stores/authStore';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    (async () => {
      await initializeDatabase();
      setDbReady(true);
      await initialize();
    })();
  }, []);

  if (!dbReady || isLoading) {
    return (
      <SafeAreaProvider>
        <AppLoader message="Memuat Kasir POS..." />
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
