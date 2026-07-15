import type { SecureStoragePlugin } from "@aparajita/capacitor-secure-storage";

export type SupabaseAuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export const NATIVE_SUPABASE_AUTH_STORAGE_PREFIX = "cgy.supabase.auth.";
export const NATIVE_SUPABASE_KEYCHAIN_ACCESS = "whenUnlockedThisDeviceOnly";

type ConfiguredSecureStorage = {
  storage: SecureStoragePlugin;
};

let configuredSecureStorage: Promise<ConfiguredSecureStorage> | null = null;

function storageOperationError(operation: string): Error {
  return new Error(`Native secure Supabase auth storage failed during ${operation}.`);
}

async function loadConfiguredSecureStorage(): Promise<ConfiguredSecureStorage> {
  configuredSecureStorage ??= import("@aparajita/capacitor-secure-storage").then(
    async ({ KeychainAccess, SecureStorage }) => {
      await SecureStorage.setKeyPrefix(NATIVE_SUPABASE_AUTH_STORAGE_PREFIX);
      await SecureStorage.setSynchronize(false);
      await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
      return { storage: SecureStorage };
    }
  );
  return configuredSecureStorage;
}

export function nativeSupabaseAuthStorageKey(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

export function createNativeSupabaseAuthStorage(): SupabaseAuthStorage {
  return {
    async getItem(key) {
      try {
        return await (await loadConfiguredSecureStorage()).storage.getItem(key);
      } catch {
        throw storageOperationError("read");
      }
    },
    async setItem(key, value) {
      try {
        await (await loadConfiguredSecureStorage()).storage.setItem(key, value);
      } catch {
        throw storageOperationError("write");
      }
    },
    async removeItem(key) {
      try {
        await (await loadConfiguredSecureStorage()).storage.removeItem(key);
      } catch {
        throw storageOperationError("remove");
      }
    }
  };
}

export function resetNativeSupabaseAuthStorageForTests() {
  configuredSecureStorage = null;
}
