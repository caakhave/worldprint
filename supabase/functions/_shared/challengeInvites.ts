export type ChallengeInviteDecodeResult =
  | {
      ok: true;
      payload: ChallengeInvitePayload;
    }
  | {
      ok: false;
      error: string;
    };

export type ChallengeInvitePayload = {
  schemaVersion: "1";
  game: "worldprint";
  kind: "daily" | "practice";
  contentVersion: string;
  tier: "explorer" | "analyst" | "cartographer" | "atlasMaster";
  roundIds: string[];
  dateKey?: string;
  challenger?: {
    score: number;
    possible: number;
    rankTitle: string;
    solvedCount: number;
    roundCount: number;
    strip: string;
  };
  checksum: string;
};

export type ChallengeInviteRequest = {
  challengeCode: string;
  recipientEmail: string;
  recipientDomain: string;
  message: string | null;
  payload: ChallengeInvitePayload;
};

export type ChallengeInviteConfig = {
  fromEmail: string;
  siteUrl: string;
};

export type ChallengeInviteEmail = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export const CHALLENGE_INVITE_DAILY_LIMIT = 5;
export const CHALLENGE_INVITE_MAX_MESSAGE_LENGTH = 180;
export const CHALLENGE_INVITE_MAX_BODY_BYTES = 4096;
export const CHALLENGE_INVITE_SUBJECT = "You’ve been challenged on Can You Geo";

const TIERS = new Set(["explorer", "analyst", "cartographer", "atlasMaster"]);
const PAYLOAD_KEYS = new Set(["schemaVersion", "game", "kind", "contentVersion", "tier", "roundIds", "dateKey", "challenger", "checksum"]);
const CHALLENGER_KEYS = new Set(["score", "possible", "rankTitle", "solvedCount", "roundCount", "strip"]);
const REQUEST_KEYS = new Set(["challengeCode", "recipientEmail", "message"]);
const MESSAGE_FORBIDDEN_PATTERN = /\b(answer|answers|correct country|indicator|source|solution|world bank|api\.worldbank|spoiler)\b/i;
const EMAIL_COLORS = {
  background: "#000411",
  panel: "#03222D",
  panelDeep: "#04151D",
  border: "#0b6971",
  text: "#F5F7EE",
  warm: "#E1E9D0",
  muted: "#97B09D",
  cyan: "#0FD8DB",
  lime: "#C2ED39",
  darkText: "#000818",
  gold: "#BA7A36"
};

export function parseChallengeInviteRequest(input: {
  contentType: string | null;
  bodyText: string;
  maxBytes?: number;
}): { invite: ChallengeInviteRequest | null; error: string | null } {
  const maxBytes = input.maxBytes ?? CHALLENGE_INVITE_MAX_BODY_BYTES;
  if (new TextEncoder().encode(input.bodyText).byteLength > maxBytes) {
    return { invite: null, error: "Challenge invite request is too large." };
  }
  if (!input.contentType?.toLowerCase().includes("application/json")) {
    return { invite: null, error: "Challenge invite requests must be JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.bodyText);
  } catch {
    return { invite: null, error: "Invalid challenge invite request." };
  }

  if (!isRecord(parsed)) {
    return { invite: null, error: "Invalid challenge invite request." };
  }
  if (Object.keys(parsed).some((key) => !REQUEST_KEYS.has(key))) {
    return { invite: null, error: "Challenge invite request includes unsupported fields." };
  }

  const recipient = normalizeRecipientEmail(parsed.recipientEmail);
  if (!recipient.ok) return { invite: null, error: recipient.error };

  const message = normalizeInviteMessage(parsed.message);
  if (!message.ok) return { invite: null, error: message.error };

  if (typeof parsed.challengeCode !== "string") {
    return { invite: null, error: "Challenge code is required." };
  }
  const challengeCode = parsed.challengeCode.trim();
  const decoded = decodeChallengeInviteCode(challengeCode);
  if (!decoded.ok) return { invite: null, error: decoded.error };

  return {
    invite: {
      challengeCode,
      recipientEmail: recipient.email,
      recipientDomain: recipient.domain,
      message: message.message,
      payload: decoded.payload
    },
    error: null
  };
}

export function normalizeRecipientEmail(value: unknown): { ok: true; email: string; domain: string } | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: "Friend email is required." };
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return { ok: false, error: "Enter a valid friend email." };
  if (email.includes(" ") || email.includes("<") || email.includes(">") || email.includes(",") || email.includes(";")) {
    return { ok: false, error: "Enter a single valid friend email." };
  }
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || parts[0].length > 64 || !parts[1].includes(".")) {
    return { ok: false, error: "Enter a valid friend email." };
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    return { ok: false, error: "Enter a valid friend email." };
  }
  return { ok: true, email, domain: parts[1] };
}

export function normalizeInviteMessage(value: unknown): { ok: true; message: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "") return { ok: true, message: null };
  if (typeof value !== "string") return { ok: false, error: "Challenge note must be text." };
  const message = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!message) return { ok: true, message: null };
  if (message.length > CHALLENGE_INVITE_MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Keep the note under ${CHALLENGE_INVITE_MAX_MESSAGE_LENGTH} characters.` };
  }
  if (/https?:\/\/|www\.|@/i.test(message)) {
    return { ok: false, error: "Keep the note simple. Links and email addresses are not allowed." };
  }
  if (MESSAGE_FORBIDDEN_PATTERN.test(message)) {
    return { ok: false, error: "Keep the note spoiler-free." };
  }
  return { ok: true, message };
}

export function decodeChallengeInviteCode(code: string | null | undefined): ChallengeInviteDecodeResult {
  if (!code) return { ok: false, error: "Challenge code is required." };
  if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length > 3600) {
    return { ok: false, error: "Challenge code is not valid." };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(code)) as unknown;
    const payload = validateChallengeInvitePayload(parsed);
    if (!payload.ok) return payload;
    const body: Omit<ChallengeInvitePayload, "checksum"> = {
      schemaVersion: payload.payload.schemaVersion,
      game: payload.payload.game,
      kind: payload.payload.kind,
      contentVersion: payload.payload.contentVersion,
      tier: payload.payload.tier,
      roundIds: payload.payload.roundIds,
      dateKey: payload.payload.dateKey,
      challenger: payload.payload.challenger
    };
    const checksum = checksumForBody(body);
    if (payload.payload.checksum !== checksum) {
      return { ok: false, error: "Challenge code did not pass validation." };
    }
    return payload;
  } catch {
    return { ok: false, error: "Challenge code is not valid." };
  }
}

export function buildChallengeInviteEmail(input: {
  config: ChallengeInviteConfig;
  recipientEmail: string;
  challengeCode: string;
  message: string | null;
  payload: ChallengeInvitePayload;
}): ChallengeInviteEmail {
  const challengeUrl = challengeUrlFor(input.config.siteUrl, input.challengeCode);
  const challenger = input.payload.challenger;
  const scoreLine = challenger
    ? `They scored ${challenger.score.toLocaleString("en-US")} out of ${challenger.possible.toLocaleString("en-US")} and finished as ${challenger.rankTitle}.`
    : "They sent you a spoiler-free Mystery Map challenge.";
  const solvedLine = challenger ? `${challenger.solvedCount}/${challenger.roundCount} maps solved · ${challenger.strip}` : "";
  const messageLines = input.message ? ["", "Their note:", input.message] : [];
  const htmlScoreLine = challenger
    ? `They scored <strong>${escapeHtml(challenger.score.toLocaleString("en-US"))} out of ${escapeHtml(
        challenger.possible.toLocaleString("en-US")
      )}</strong> in Mystery Map and finished as <strong>${escapeHtml(challenger.rankTitle)}</strong>.`
    : "They sent you a spoiler-free Mystery Map challenge.";
  const htmlSolvedLine = challenger
    ? `<p style="margin:0 0 18px;color:${EMAIL_COLORS.muted};font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(
        `${challenger.solvedCount}/${challenger.roundCount} maps solved · ${challenger.strip}`
      )}</p>`
    : "";
  const htmlMessage = input.message
    ? `<div style="margin:22px 0 0;padding:14px 16px;border:1px solid ${EMAIL_COLORS.border};border-radius:10px;background:${EMAIL_COLORS.panelDeep};">
        <p style="margin:0 0 6px;color:${EMAIL_COLORS.cyan};font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Their note</p>
        <p style="margin:0;color:${EMAIL_COLORS.warm};font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">${escapeHtml(input.message).replaceAll("\n", "<br>")}</p>
      </div>`
    : "";

  return {
    from: publicChallengeInviteFrom(input.config.fromEmail),
    to: [input.recipientEmail],
    subject: CHALLENGE_INVITE_SUBJECT,
    text: [
      "A friend challenged you to Can You Geo? Mystery Map.",
      scoreLine,
      solvedLine,
      "Play the same map set:",
      challengeUrl,
      ...messageLines,
      "",
      "No answers, countries, indicators, or source labels are shown before you play.",
      "Challenge games do not affect today's official Daily score or streak.",
      "",
      "This one-time invite was sent by a signed-in Can You Geo player. You were not added to any marketing list."
    ]
      .filter((line) => line !== "")
      .join("\n"),
    html: `<!doctype html>
<html>
  <body style="margin:0;background:${EMAIL_COLORS.background};padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid ${EMAIL_COLORS.border};border-radius:14px;background:${EMAIL_COLORS.panel};padding:28px;color:${EMAIL_COLORS.text};">
      <p style="margin:0 0 10px;color:${EMAIL_COLORS.cyan};font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Can You Geo Mystery Map</p>
      <h1 style="margin:0 0 14px;color:${EMAIL_COLORS.text};font-family:Georgia,serif;font-size:30px;line-height:1.1;">A friend challenged you on Can You Geo.</h1>
      <p style="margin:0 0 10px;color:${EMAIL_COLORS.warm};font-family:Arial,sans-serif;font-size:17px;line-height:1.5;">${htmlScoreLine}</p>
      ${htmlSolvedLine}
      <p style="margin:0 0 22px;color:${EMAIL_COLORS.warm};font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">Play the same spoiler-free map set and see if you can beat them.</p>
      <div style="margin:0 0 22px;">
        <a href="${escapeHtmlAttribute(challengeUrl)}" style="display:inline-block;border-radius:999px;background:${EMAIL_COLORS.lime};color:${EMAIL_COLORS.darkText};font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:13px 20px;">Play the challenge</a>
        <p style="margin:14px 0 0;color:${EMAIL_COLORS.muted};font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">Button not working? Copy this challenge link:<br><a href="${escapeHtmlAttribute(challengeUrl)}" style="color:${EMAIL_COLORS.cyan};text-decoration:underline;word-break:break-all;">${escapeHtml(challengeUrl)}</a></p>
      </div>
      ${htmlMessage}
      <p style="margin:22px 0 0;color:${EMAIL_COLORS.muted};font-family:Arial,sans-serif;font-size:14px;line-height:1.5;"><strong style="color:${EMAIL_COLORS.gold};">No spoilers:</strong> answers, countries, indicators, and source labels stay hidden before play. Challenge games do not affect today's official Daily score or streak.</p>
      <p style="margin:18px 0 0;color:${EMAIL_COLORS.muted};font-family:Arial,sans-serif;font-size:12px;line-height:1.5;">This one-time invite was sent by a signed-in Can You Geo player. You were not added to any marketing list.</p>
    </div>
  </body>
</html>`
  };
}

function publicChallengeInviteFrom(fromEmail: string): string {
  const opsDisplayName = /^Can You Geo Ops\s*(<.+>)$/i.exec(fromEmail.trim());
  return opsDisplayName ? `Can You Geo ${opsDisplayName[1]}` : fromEmail;
}

export function buildResendChallengeInviteRequest(input: { apiKey: string; email: ChallengeInviteEmail }): { url: string; init: RequestInit } {
  return {
    url: "https://api.resend.com/emails",
    init: {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(input.email)
    }
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function challengeInviteRateLimitExceeded(sentInWindow: number, limit = CHALLENGE_INVITE_DAILY_LIMIT): boolean {
  return sentInWindow >= Math.max(1, limit);
}

export function challengeInviteRemaining(sentInWindow: number, limit = CHALLENGE_INVITE_DAILY_LIMIT): number {
  return Math.max(0, Math.max(1, limit) - sentInWindow);
}

function validateChallengeInvitePayload(input: unknown): ChallengeInviteDecodeResult {
  if (!isRecord(input)) return { ok: false, error: "Challenge code is not valid." };
  if (Object.keys(input).some((key) => !PAYLOAD_KEYS.has(key))) {
    return { ok: false, error: "Challenge code includes unsupported fields." };
  }
  if (input.schemaVersion !== "1" || input.game !== "worldprint") {
    return { ok: false, error: "Challenge code uses an unsupported format." };
  }
  if (input.kind !== "daily" && input.kind !== "practice") {
    return { ok: false, error: "Challenge code uses an unsupported map set." };
  }
  if (typeof input.contentVersion !== "string" || input.contentVersion.length < 1) {
    return { ok: false, error: "Challenge code is missing its content version." };
  }
  if (typeof input.tier !== "string" || !TIERS.has(input.tier)) {
    return { ok: false, error: "Challenge code uses an unsupported skill tier." };
  }
  if (!Array.isArray(input.roundIds) || input.roundIds.length < 1 || input.roundIds.length > 5) {
    return { ok: false, error: "Challenge code has an invalid map set." };
  }
  if (input.roundIds.some((roundId) => typeof roundId !== "string" || roundId.length < 1 || roundId.length > 160)) {
    return { ok: false, error: "Challenge code has an invalid map set." };
  }
  if (input.dateKey !== undefined && (typeof input.dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey))) {
    return { ok: false, error: "Challenge code has an invalid date." };
  }
  if (typeof input.checksum !== "string" || input.checksum.length < 6) {
    return { ok: false, error: "Challenge code is missing validation." };
  }
  const challenger = validateChallenger(input.challenger);
  if (!challenger.ok) return challenger;

  return {
    ok: true,
    payload: {
      schemaVersion: "1",
      game: "worldprint",
      kind: input.kind,
      contentVersion: input.contentVersion,
      tier: input.tier as ChallengeInvitePayload["tier"],
      roundIds: input.roundIds,
      dateKey: input.dateKey,
      challenger: challenger.challenger,
      checksum: input.checksum
    }
  };
}

function validateChallenger(
  input: unknown
): { ok: true; challenger: ChallengeInvitePayload["challenger"] } | { ok: false; error: string } {
  if (input === undefined) return { ok: true, challenger: undefined };
  if (!isRecord(input)) return { ok: false, error: "Challenge score summary is invalid." };
  if (Object.keys(input).some((key) => !CHALLENGER_KEYS.has(key))) {
    return { ok: false, error: "Challenge score summary includes unsupported fields." };
  }
  if (!isSafeInteger(input.score) || !isSafeInteger(input.possible) || input.possible <= 0) {
    return { ok: false, error: "Challenge score summary is invalid." };
  }
  if (input.score < -50000 || input.score > 50000 || input.possible > 25000) {
    return { ok: false, error: "Challenge score summary is invalid." };
  }
  if (typeof input.rankTitle !== "string" || input.rankTitle.length < 1 || input.rankTitle.length > 80) {
    return { ok: false, error: "Challenge rank is invalid." };
  }
  if (!isSafeInteger(input.solvedCount) || !isSafeInteger(input.roundCount) || input.solvedCount < 0 || input.roundCount < 1 || input.roundCount > 5) {
    return { ok: false, error: "Challenge solved count is invalid." };
  }
  if (input.solvedCount > input.roundCount || typeof input.strip !== "string" || input.strip.length < 1 || input.strip.length > 20) {
    return { ok: false, error: "Challenge result strip is invalid." };
  }
  return {
    ok: true,
    challenger: {
      score: input.score,
      possible: input.possible,
      rankTitle: input.rankTitle,
      solvedCount: input.solvedCount,
      roundCount: input.roundCount,
      strip: input.strip
    }
  };
}

function checksumForBody(body: Omit<ChallengeInvitePayload, "checksum">): string {
  let hash = 2166136261;
  const text = canonical(body);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function challengeUrlFor(siteUrl: string, challengeCode: string): string {
  const origin = siteUrl.trim() || "https://canyougeo.com";
  const url = new URL("/challenge/mystery-map/", origin);
  url.searchParams.set("c", challengeCode);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}
