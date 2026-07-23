import type { GoogleSubscriptionPurchaseV2 } from "./googlePlayRtdn.ts";

type ServiceAccountCredential = {
  type?: string;
  project_id?: string;
  private_key?: string;
  client_email?: string;
};

type FetchLike = typeof fetch;

type GooglePlayPublisherStage =
  | "service_account_secret_loading"
  | "google_oauth_access_token"
  | "subscriptionsv2_get"
  | "google_response_parsing_state_validation"
  | "purchase_acknowledgement";

type GoogleApiError = {
  code?: number;
  status?: string;
  message?: string;
};

export class GooglePlayPublisherError extends Error {
  readonly result: string;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly stage: GooglePlayPublisherStage;
  readonly googleApiError: GoogleApiError | null;

  constructor(
    result: string,
    retryable: boolean,
    status: number | null = null,
    options: { stage?: GooglePlayPublisherStage; googleApiError?: GoogleApiError | null } = {}
  ) {
    super(`Google Play Publisher read failed: ${result}`);
    this.name = "GooglePlayPublisherError";
    this.result = result;
    this.retryable = retryable;
    this.status = status;
    this.stage = options.stage ?? "subscriptionsv2_get";
    this.googleApiError = options.googleApiError ?? null;
  }
}

export async function fetchSubscriptionPurchaseV2(input: {
  serviceAccountJson: string;
  packageName: string;
  purchaseToken: string;
  fetchImpl?: FetchLike;
}): Promise<GoogleSubscriptionPurchaseV2> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const credential = parseServiceAccountCredential(input.serviceAccountJson);
  const accessToken = await serviceAccountAccessToken({ credential, fetchImpl });
  const response = await fetchImpl(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(input.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
      input.purchaseToken
    )}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    }
  );
  if (!response.ok) {
    throw new GooglePlayPublisherError(classifyAndroidPublisherStatus(response.status), isRetryableAndroidPublisherStatus(response.status), response.status, {
      stage: "subscriptionsv2_get",
      googleApiError: await readGoogleApiError(response)
    });
  }
  const json = await response.json();
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new GooglePlayPublisherError("invalid_subscription_response", true, response.status, {
      stage: "google_response_parsing_state_validation"
    });
  }
  return json as GoogleSubscriptionPurchaseV2;
}

export async function acknowledgeSubscriptionPurchase(input: {
  serviceAccountJson: string;
  packageName: string;
  subscriptionId: string;
  purchaseToken: string;
  obfuscatedAccountId?: string | null;
  fetchImpl?: FetchLike;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const credential = parseServiceAccountCredential(input.serviceAccountJson);
  const accessToken = await serviceAccountAccessToken({ credential, fetchImpl });
  const body = input.obfuscatedAccountId
    ? {
        externalAccountIds: {
          obfuscatedAccountId: input.obfuscatedAccountId
        }
      }
    : {};
  const response = await fetchImpl(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(input.packageName)}/purchases/subscriptions/${encodeURIComponent(
      input.subscriptionId
    )}/tokens/${encodeURIComponent(input.purchaseToken)}:acknowledge`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) {
    throw new GooglePlayPublisherError(classifyAndroidPublisherStatus(response.status), isRetryableAndroidPublisherStatus(response.status), response.status, {
      stage: "purchase_acknowledgement",
      googleApiError: await readGoogleApiError(response)
    });
  }
}

function parseServiceAccountCredential(rawJson: string): ServiceAccountCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new GooglePlayPublisherError("invalid_service_account_json", false, null, { stage: "service_account_secret_loading" });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GooglePlayPublisherError("invalid_service_account_json", false, null, { stage: "service_account_secret_loading" });
  }
  const credential = parsed as ServiceAccountCredential;
  if (credential.type !== "service_account" || !credential.client_email || !credential.private_key) {
    throw new GooglePlayPublisherError("invalid_service_account_json", false, null, { stage: "service_account_secret_loading" });
  }
  return credential;
}

async function serviceAccountAccessToken(input: { credential: ServiceAccountCredential; fetchImpl: FetchLike }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: input.credential.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const assertion = `${base64UrlJson({ alg: "RS256", typ: "JWT" })}.${base64UrlJson(claim)}`;
  let signature: Uint8Array;
  try {
    signature = await signRs256(assertion, input.credential.private_key ?? "");
  } catch {
    throw new GooglePlayPublisherError("invalid_service_account_json", false, null, { stage: "service_account_secret_loading" });
  }
  const response = await input.fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${assertion}.${base64UrlBytes(signature)}`
    })
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json || typeof json !== "object" || typeof (json as Record<string, unknown>).access_token !== "string") {
    throw new GooglePlayPublisherError("token_exchange_failed", isRetryableAndroidPublisherStatus(response.status), response.status, {
      stage: "google_oauth_access_token",
      googleApiError: googleApiErrorFromJson(json)
    });
  }
  return (json as Record<string, string>).access_token;
}

async function readGoogleApiError(response: Response): Promise<GoogleApiError | null> {
  return googleApiErrorFromJson(await response.json().catch(() => null));
}

function googleApiErrorFromJson(json: unknown): GoogleApiError | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const maybeError = (json as Record<string, unknown>).error;
  const source = maybeError && typeof maybeError === "object" && !Array.isArray(maybeError) ? (maybeError as Record<string, unknown>) : (json as Record<string, unknown>);
  const apiError: GoogleApiError = {};
  if (typeof source.code === "number") apiError.code = source.code;
  if (typeof source.status === "string") apiError.status = source.status;
  if (typeof source.message === "string") apiError.message = source.message;
  return Object.keys(apiError).length ? apiError : null;
}

async function signRs256(payload: string, privateKeyPem: string): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(payload)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function base64UrlJson(value: unknown): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function classifyAndroidPublisherStatus(status: number): string {
  if (status === 400) return "invalid_purchase_request";
  if (status === 401) return "publisher_unauthenticated";
  if (status === 403) return "publisher_permission_denied";
  if (status === 404) return "purchase_not_found";
  if (status === 409) return "publisher_concurrent_update";
  if (status === 410) return "purchase_token_no_longer_valid";
  if (status >= 500) return "publisher_unavailable";
  return "publisher_read_failed";
}

function isRetryableAndroidPublisherStatus(status: number): boolean {
  return status === 409 || status >= 500 || status === 0;
}
