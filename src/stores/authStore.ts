import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";
import { userRepository } from "../repositories/userRepository";

const AUTH_KEY = "cashier_auth_user";
const DEVICE_KEY = "cashier_device_id";

interface AuthState {
  user: User | null;
  deviceId: string;
  isLoading: boolean;
  isAuthBusy: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  loginWithCode: (
    code: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isOwner: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  deviceId: "",
  isLoading: true,
  isAuthBusy: false,
  isAuthenticated: false,

  initialize: async () => {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
      if (!deviceId) {
        deviceId =
          "device_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
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
    set({ isAuthBusy: true });
    try {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        set({ isAuthBusy: false });
        return { success: false, error: "Silakan masukkan kode akses Anda" };
      }

      // Always validate user from Supabase (cloud), not local SQLite
      const user = await userRepository.findByAccessCodeFromSupabase(trimmed);
      if (!user) {
        set({ isAuthBusy: false });
        return {
          success: false,
          error: "Kode akses tidak valid. Silakan coba lagi.",
        };
      }

      if (!user.is_active) {
        set({ isAuthBusy: false });
        return { success: false, error: "Akun ini telah dinonaktifkan." };
      }

      const { deviceId } = get();

      // Device lock in Supabase
      try {
        const lockedDevice =
          await userRepository.checkCloudDeviceLock(trimmed);

        if (lockedDevice && lockedDevice !== deviceId) {
          set({ isAuthBusy: false });
          return {
            success: false,
            error:
              "Kode akses ini sudah digunakan di perangkat lain. Perangkat lain harus logout terlebih dahulu.",
          };
        }

        await userRepository.lockDeviceInCloud(trimmed, deviceId);
      } catch (supaErr: unknown) {
        const msg = (supaErr instanceof Error ? supaErr.message : String(supaErr)) || "Kesalahan tidak diketahui";
        set({ isAuthBusy: false });
        const isNetwork = /fetch|network|internet|ECONNREFUSED/i.test(msg);
        return {
          success: false,
          error: isNetwork ? "Tidak dapat terhubung. Periksa koneksi internet." : msg,
        };
      }

      // Upsert user to local SQLite for offline features (e.g. employee picker)
      await userRepository.upsertUserToLocal(user);
      await userRepository.setLocalDeviceLock(user.access_code, deviceId);

      // Persist session
      await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isAuthBusy: false });
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("[Login] Unexpected error:", msg);
      set({ isAuthBusy: false });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    set({ isAuthBusy: true });
    try {
      const { user } = get();

      // Release device lock in Supabase
      if (user) {
        try {
          await userRepository.unlockDeviceInCloud(user.access_code);
        } catch {
          // Best-effort: if offline, the lock remains until the next successful logout.
        }
        await userRepository.setLocalDeviceLock(user.access_code, null);
      }

      await SecureStore.deleteItemAsync(AUTH_KEY);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isAuthBusy: false });
    }
  },

  isOwner: () => get().user?.role === "owner",
}));
