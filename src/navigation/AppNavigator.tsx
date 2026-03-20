import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  Package,
  ArrowRightLeft,
  RefreshCw,
  User,
  Users,
  BarChart3,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import { useAuthStore } from "../stores/authStore";
import { colors } from "../config/theme";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ProductsScreen } from "../screens/products/ProductsScreen";
import { ProductFormScreen } from "../screens/products/ProductFormScreen";
import { ProductDetailScreen } from "../screens/products/ProductDetailScreen";
import { CheckoutScreen } from "../screens/checkout/CheckoutScreen";
import { CartReviewScreen } from "../screens/checkout/CartReviewScreen";
import { TransactionSuccessScreen } from "../screens/checkout/TransactionSuccessScreen";
import { TransactionsScreen } from "../screens/transactions/TransactionsScreen";
import { TransactionDetailScreen } from "../screens/transactions/TransactionDetailScreen";
import { SyncCenterScreen } from "../screens/sync/SyncCenterScreen";
import { ReportsScreen } from "../screens/reports/ReportsScreen";
import { AttendanceScreen } from "../screens/attendance/AttendanceScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { EmployeeListScreen } from "../screens/employees/EmployeeListScreen";
import { EmployeeFormScreen } from "../screens/employees/EmployeeFormScreen";
import { EmployeeSalaryScreen } from "../screens/employees/EmployeeSalaryScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "600" as const, fontSize: 17 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ProductsList"
        component={ProductsScreen}
        options={{ title: "Produk" }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={{ title: "Produk" }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Detail Produk" }}
      />
    </Stack.Navigator>
  );
}

function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TransactionsList"
        component={TransactionsScreen}
        options={{ title: "Transaksi" }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: "Detail Transaksi" }}
      />
    </Stack.Navigator>
  );
}

function CheckoutStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "Penjualan Baru" }}
      />
      <Stack.Screen
        name="CartReview"
        component={CartReviewScreen}
        options={{ title: "Ringkasan Keranjang" }}
      />
      <Stack.Screen
        name="TransactionSuccess"
        component={TransactionSuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function EmployeesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="EmployeeList"
        component={EmployeeListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmployeeForm"
        component={EmployeeFormScreen}
        options={({ route }: any) => ({
          title: route.params?.employeeId ? "Edit Karyawan" : "Tambah Karyawan",
        })}
      />
      <Stack.Screen
        name="EmployeeSalary"
        component={EmployeeSalaryScreen}
        options={{ title: "Detail Gaji" }}
      />
    </Stack.Navigator>
  );
}

function AttendanceStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AttendanceMain"
        component={AttendanceScreen}
        options={{ title: "Absensi" }}
      />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const tabBarOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 4,
    height: 85,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  headerShown: false,
};

function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Beranda",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{
          tabBarLabel: "Produk",
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CheckoutStack"
        component={CheckoutStack}
        options={{
          tabBarLabel: "Kasir",
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: "Riwayat",
          tabBarIcon: ({ color, size }) => (
            <ArrowRightLeft size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SyncTab"
        component={SyncCenterScreen}
        options={{
          ...screenOptions,
          headerShown: false,
          tabBarLabel: "Sinkron",
          tabBarIcon: ({ color, size }) => (
            <RefreshCw size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Dasbor",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{
          tabBarLabel: "Produk",
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EmployeesTab"
        component={EmployeesStack}
        options={{
          tabBarLabel: "Karyawan",
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: "Transaksi",
          tabBarIcon: ({ color, size }) => (
            <ArrowRightLeft size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Laporan",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Pengaturan",
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function SyncStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SyncMain"
        component={SyncCenterScreen}
        options={{ title: "Pusat Sinkronisasi" }}
      />
    </Stack.Navigator>
  );
}

function OwnerRoot() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="CheckoutStack" component={CheckoutStack} />
      <Stack.Screen name="AttendanceStack" component={AttendanceStack} />
      <Stack.Screen name="SyncStack" component={SyncStack} />
    </Stack.Navigator>
  );
}

function EmployeeRoot() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
      <Stack.Screen name="AttendanceStack" component={AttendanceStack} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === "owner" ? (
          <Stack.Screen name="OwnerRoot" component={OwnerRoot} />
        ) : (
          <Stack.Screen name="EmployeeRoot" component={EmployeeRoot} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
