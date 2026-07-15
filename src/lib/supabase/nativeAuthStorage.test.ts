import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNativeSupabaseAuthStorage,
  NATIVE_SUPABASE_AUTH_STORAGE_PREFIX,
  nativeSupabaseAuthStorageKey,
  resetNativeSupabaseAuthStorageForTests
} from "@/lib/supabase/nativeAuthStorage";

const secureStorageMocks = vi.hoisted(() => ({
  KeychainAccess: {
    whenUnlocked: 0,
    whenUnlockedThisDeviceOnly: 1
  },
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  setKeyPrefix: vi.fn(),
  setSynchronize: vi.fn(),
  setDefaultKeychainAccess: vi.fn(),
  then: vi.fn()
}));

vi.mock("@aparajita/capacitor-secure-storage", () => ({
  KeychainAccess: secureStorageMocks.KeychainAccess,
  SecureStorage: {
    getItem: secureStorageMocks.getItem,
    setItem: secureStorageMocks.setItem,
    removeItem: secureStorageMocks.removeItem,
    setKeyPrefix: secureStorageMocks.setKeyPrefix,
    setSynchronize: secureStorageMocks.setSynchronize,
    setDefaultKeychainAccess: secureStorageMocks.setDefaultKeychainAccess,
    then: secureStorageMocks.then
  }
}));

describe("native Supabase auth storage", () => {
  beforeEach(() => {
    resetNativeSupabaseAuthStorageForTests();
    secureStorageMocks.getItem.mockReset();
    secureStorageMocks.getItem.mockResolvedValue(null);
    secureStorageMocks.setItem.mockReset();
    secureStorageMocks.setItem.mockResolvedValue(undefined);
    secureStorageMocks.removeItem.mockReset();
    secureStorageMocks.removeItem.mockResolvedValue(undefined);
    secureStorageMocks.setKeyPrefix.mockReset();
    secureStorageMocks.setKeyPrefix.mockResolvedValue(undefined);
    secureStorageMocks.setSynchronize.mockReset();
    secureStorageMocks.setSynchronize.mockResolvedValue(undefined);
    secureStorageMocks.setDefaultKeychainAccess.mockReset();
    secureStorageMocks.setDefaultKeychainAccess.mockResolvedValue(undefined);
    secureStorageMocks.then.mockReset();
  });

  afterEach(() => {
    resetNativeSupabaseAuthStorageForTests();
  });

  it("uses the Supabase project storage-key convention", () => {
    expect(nativeSupabaseAuthStorageKey("https://jquebthneczqdxagagof.supabase.co")).toBe(
      "sb-jquebthneczqdxagagof-auth-token"
    );
  });

  it("configures prefix, iCloud sync, and keychain access once", async () => {
    const storage = createNativeSupabaseAuthStorage();

    await Promise.all([storage.getItem("session"), storage.setItem("session", "stored"), storage.removeItem("session")]);

    expect(secureStorageMocks.setKeyPrefix).toHaveBeenCalledTimes(1);
    expect(secureStorageMocks.setKeyPrefix).toHaveBeenCalledWith(NATIVE_SUPABASE_AUTH_STORAGE_PREFIX);
    expect(secureStorageMocks.setSynchronize).toHaveBeenCalledTimes(1);
    expect(secureStorageMocks.setSynchronize).toHaveBeenCalledWith(false);
    expect(secureStorageMocks.setDefaultKeychainAccess).toHaveBeenCalledTimes(1);
    expect(secureStorageMocks.setDefaultKeychainAccess).toHaveBeenCalledWith(
      secureStorageMocks.KeychainAccess.whenUnlockedThisDeviceOnly
    );
    expect(secureStorageMocks.then).not.toHaveBeenCalled();
  });

  it("delegates getItem, setItem, and removeItem to secure storage", async () => {
    secureStorageMocks.getItem.mockResolvedValueOnce("stored");
    const storage = createNativeSupabaseAuthStorage();

    await expect(storage.getItem("session")).resolves.toBe("stored");
    await storage.setItem("session", "stored");
    await storage.removeItem("session");

    expect(secureStorageMocks.getItem).toHaveBeenCalledWith("session");
    expect(secureStorageMocks.setItem).toHaveBeenCalledWith("session", "stored");
    expect(secureStorageMocks.removeItem).toHaveBeenCalledWith("session");
  });

  it("returns null for missing keys", async () => {
    const storage = createNativeSupabaseAuthStorage();

    await expect(storage.getItem("missing")).resolves.toBeNull();
  });

  it("does not fall back to localStorage when secure storage fails", async () => {
    const localStorageGet = vi.spyOn(window.localStorage.__proto__, "getItem");
    secureStorageMocks.getItem.mockRejectedValueOnce(new Error("native store unavailable for session"));
    const storage = createNativeSupabaseAuthStorage();

    await expect(storage.getItem("session")).rejects.toThrow("Native secure Supabase auth storage failed during read.");

    expect(localStorageGet).not.toHaveBeenCalled();
    localStorageGet.mockRestore();
  });

  it("sanitizes write and remove errors", async () => {
    secureStorageMocks.setItem.mockRejectedValueOnce(new Error("raw write failure"));
    secureStorageMocks.removeItem.mockRejectedValueOnce(new Error("raw remove failure"));
    const storage = createNativeSupabaseAuthStorage();

    await expect(storage.setItem("session", "credential-fixture")).rejects.toThrow(
      "Native secure Supabase auth storage failed during write."
    );
    await expect(storage.removeItem("session")).rejects.toThrow(
      "Native secure Supabase auth storage failed during remove."
    );
  });

  it("does not log stored auth values", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = createNativeSupabaseAuthStorage();

    await storage.setItem("session", "credential-fixture");
    await storage.getItem("session");
    await storage.removeItem("session");

    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    consoleLog.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });
});
