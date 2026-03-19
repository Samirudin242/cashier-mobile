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
        options={{ title: "Products" }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={{ title: "Product" }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product Detail" }}
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
        options={{ title: "Transactions" }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: "Transaction" }}
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
        options={{ title: "New Sale" }}
      />
      <Stack.Screen
        name="CartReview"
        component={CartReviewScreen}
        options={{ title: "Review Cart" }}
      />
      <Stack.Screen
        name="TransactionSuccess"
        component={TransactionSuccessScreen}
        options={{ headerShown: false }}
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
        options={{ title: "Attendance" }}
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
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{
          tabBarLabel: "Products",
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CheckoutStack"
        component={CheckoutStack}
        options={{
          tabBarLabel: "Sale",
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: "History",
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
          tabBarLabel: "Sync",
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
          tabBarLabel: "Profile",
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
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{
          tabBarLabel: "Products",
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: "Transactions",
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
          tabBarLabel: "Reports",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SyncTab"
        component={SyncCenterScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Sync",
          tabBarIcon: ({ color, size }) => (
            <RefreshCw size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function OwnerRoot() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="CheckoutStack" component={CheckoutStack} />
      <Stack.Screen name="AttendanceStack" component={AttendanceStack} />
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
