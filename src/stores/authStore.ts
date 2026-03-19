import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { userRepository } from '../repositories/userRepository';

const AUTH_KEY = 'cashier_auth_user';
const DEVICE_KEY = 'cashier_device_id';

interface AuthState {
  user: User | null;
  deviceId: string;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  loginWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isOwner: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  deviceId: '',
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
      }

      const stored = await SecureStore.getItemAsync(AUTH_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        set({ user, deviceId, isLoading: false, isAuthenticated: true });
      } else {
        set({ deviceId, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  loginWithCode: async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, error: 'Please enter your access code' };
    }

    const user = await userRepository.findByAccessCode(trimmed);
    if (!user) {
      return { success: false, error: 'Invalid access code. Please try again.' };
    }

    if (!user.is_active) {
      return { success: false, error: 'This account has been deactivated.' };
    }

    const { deviceId } = get();

    // Check Supabase for device lock
    try {
      const lockedDevice = await userRepository.checkCloudDeviceLock(trimmed);

      if (lockedDevice && lockedDevice !== deviceId) {
        return {
          success: false,
          error: 'This access code is already in use on another device. The other device must logout first.',
        };
      }

      // Lock this code to the current device in Supabase
      await userRepository.lockDeviceInCloud(trimmed, deviceId);
    } catch {
      // Network unavailable — reject login since we can't verify device lock
      return {
        success: false,
        error: 'Unable to verify access code. Please check your internet connection and try again.',
      };
    }

    // Update local DB
    await userRepository.setLocalDeviceLock(user.id, deviceId);

    // Persist session
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
    return { success: true };
  },

  logout: async () => {
    const { user } = get();

    // Release device lock in Supabase
    if (user) {
      try {
        await userRepository.unlockDeviceInCloud(user.access_code);
      } catch {
        // Best-effort: if offline, the lock remains until the next successful logout.
        // This is acceptable — the user can retry logout when back online.
      }
      await userRepository.setLocalDeviceLock(user.id, null);
    }

    await SecureStore.deleteItemAsync(AUTH_KEY);
    set({ user: null, isAuthenticated: false });
  },

  isOwner: () => get().user?.role === 'owner',
}));
