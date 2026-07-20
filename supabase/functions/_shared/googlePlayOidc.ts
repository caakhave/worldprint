import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6?target=deno";
import { validateGoogleOidcClaims, type GoogleOidcClaims } from "./googlePlayRtdn.ts";

const GOOGLE_OIDC_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyGooglePubSubOidc(input: {
  token: string;
  audience: string;
  serviceAccountEmail: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { payload, protectedHeader } = await jwtVerify(input.token, GOOGLE_OIDC_JWKS, {
      algorithms: ["RS256"],
      audience: input.audience,
      issuer: ["https://accounts.google.com", "accounts.google.com"]
    });
    if (protectedHeader.alg !== "RS256") return { ok: false, error: "invalid_algorithm" };
    const claims = validateGoogleOidcClaims({
      claims: payload as GoogleOidcClaims,
      audience: input.audience,
      serviceAccountEmail: input.serviceAccountEmail
    });
    if (!claims.ok) return claims;
    return { ok: true };
  } catch {
    return { ok: false, error: "oidc_verification_failed" };
  }
}
