import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient, resetSupabaseBrowserClientForTests } from "@/lib/supabase/client";
import {
  createNativeSupabaseAuthStorage,
  nativeSupabaseAuthStorageKey,
  resetNativeSupabaseAuthStorageForTests
} from "@/lib/supabase/nativeAuthStorage";

const clientMocks = vi.hoisted(() => ({
  nativePlatform: false,
  createBrowserClient: vi.fn(),
  createClient: vi.fn(),
  secureStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    setKeyPrefix: vi.fn(),
    setSynchronize: vi.fn(),
    setDefaultKeychainAccess: vi.fn()
  },
  KeychainAccess: {
    whenUnlockedThisDeviceOnly: 1
  }
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => clientMocks.nativePlatform
  }
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: clientMocks.createBrowserClient
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: clientMocks.createClient
}));

vi.mock("@aparajita/capacitor-secure-storage", () => ({
  KeychainAccess: clientMocks.KeychainAccess,
  SecureStorage: clientMocks.secureStorage
}));

describe("createSupabaseBrowserClient", () => {
  beforeEach(() => {
    resetSupabaseBrowserClientForTests();
    resetNativeSupabaseAuthStorageForTests();
    clientMocks.nativePlatform = false;
    clientMocks.createBrowserClient.mockReset();
    clientMocks.createBrowserClient.mockReturnValue({ kind: "browser" });
    clientMocks.createClient.mockReset();
    clientMocks.createClient.mockReturnValue({ kind: "native" });
    clientMocks.secureStorage.getItem.mockReset();
    clientMocks.secureStorage.getItem.mockResolvedValue(null);
    clientMocks.secureStorage.setItem.mockReset();
    clientMocks.secureStorage.setItem.mockResolvedValue(undefined);
    clientMocks.secureStorage.removeItem.mockReset();
    clientMocks.secureStorage.removeItem.mockResolvedValue(undefined);
    clientMocks.secureStorage.setKeyPrefix.mockReset();
    clientMocks.secureStorage.setKeyPrefix.mockResolvedValue(undefined);
    clientMocks.secureStorage.setSynchronize.mockReset();
    clientMocks.secureStorage.setSynchronize.mockResolvedValue(undefined);
    clientMocks.secureStorage.setDefaultKeychainAccess.mockReset();
    clientMocks.secureStorage.setDefaultKeychainAccess.mockResolvedValue(undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://jquebthneczqdxagagof.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
  });

  afterEach(() => {
    resetSupabaseBrowserClientForTests();
    resetNativeSupabaseAuthStorageForTests();
    vi.unstubAllEnvs();
  });

  it("uses the SSR browser client outside a native Capacitor runtime", () => {
    const client = createSupabaseBrowserClient();

    expect(client).toEqual({ kind: "browser" });
    expect(clientMocks.createBrowserClient).toHaveBeenCalledWith(
      "https://jquebthneczqdxagagof.supabase.co",
      "public-anon-key"
    );
    expect(clientMocks.createClient).not.toHaveBeenCalled();
  });

  it("does not initialize native secure storage for ordinary browser runtimes", () => {
    createSupabaseBrowserClient();

    expect(clientMocks.createClient).not.toHaveBeenCalled();
    expect(clientMocks.secureStorage.setKeyPrefix).not.toHaveBeenCalled();
  });

  it("uses the native Supabase client with secure async storage in Capacitor native runtime", () => {
    clientMocks.nativePlatform = true;

    const client = createSupabaseBrowserClient();

    expect(client).toEqual({ kind: "native" });
    expect(clientMocks.createBrowserClient).not.toHaveBeenCalled();
    expect(clientMocks.createClient).toHaveBeenCalledWith(
      "https://jquebthneczqdxagagof.supabase.co",
      "public-anon-key",
      {
        auth: {
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function)
          }),
          storageKey: "sb-jquebthneczqdxagagof-auth-token",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );
  });

  it("keeps a single client instance for native callback and account callers", () => {
    clientMocks.nativePlatform = true;
    clientMocks.createClient.mockReturnValue({ kind: "native-singleton" });

    const first = createSupabaseBrowserClient();
    const second = createSupabaseBrowserClient();

    expect(first).toBe(second);
    expect(clientMocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("returns null when public Supabase env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);

    expect(createSupabaseBrowserClient()).toBeNull();
    expect(clientMocks.createBrowserClient).not.toHaveBeenCalled();
    expect(clientMocks.createClient).not.toHaveBeenCalled();
  });

  it("lets native sign-out remove the stored Supabase session through the secure adapter", async () => {
    clientMocks.nativePlatform = true;
    clientMocks.createClient.mockImplementation(
      (_url: string, _anonKey: string, options: { auth: { storage: ReturnType<typeof createNativeSupabaseAuthStorage>; storageKey: string } }) => ({
        auth: {
          signOut: () => options.auth.storage.removeItem(options.auth.storageKey)
        }
      })
    );

    const client = createSupabaseBrowserClient();
    await client?.auth.signOut();

    expect(clientMocks.secureStorage.removeItem).toHaveBeenCalledWith(
      nativeSupabaseAuthStorageKey("https://jquebthneczqdxagagof.supabase.co")
    );
  });

  it("lets native getSession restore a stored session through the secure adapter", async () => {
    clientMocks.nativePlatform = true;
    clientMocks.secureStorage.getItem.mockResolvedValueOnce(JSON.stringify({ user: { id: "test-user" } }));
    clientMocks.createClient.mockImplementation(
      (_url: string, _anonKey: string, options: { auth: { storage: ReturnType<typeof createNativeSupabaseAuthStorage>; storageKey: string } }) => ({
        auth: {
          getSession: async () => ({
            data: { session: JSON.parse((await options.auth.storage.getItem(options.auth.storageKey)) ?? "null") },
            error: null
          })
        }
      })
    );

    const client = createSupabaseBrowserClient();
    const result = await client?.auth.getSession();

    expect(result?.data.session?.user.id).toBe("test-user");
    expect(clientMocks.secureStorage.getItem).toHaveBeenCalledWith(
      nativeSupabaseAuthStorageKey("https://jquebthneczqdxagagof.supabase.co")
    );
  });
});
