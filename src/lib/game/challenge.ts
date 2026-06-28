import { z } from "zod";
import { TierSchema, type Tier } from "@/lib/content/schemas";
import type { RunState } from "@/lib/game/state";

export const CHALLENGE_SCHEMA_VERSION = "1";

const ChallengeBodySchema = z.object({
  schemaVersion: z.literal(CHALLENGE_SCHEMA_VERSION),
  game: z.literal("worldprint"),
  kind: z.enum(["daily", "practice"]),
  contentVersion: z.string().min(1),
  tier: TierSchema,
  roundIds: z.array(z.string().min(1)).min(1).max(5),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const ChallengePayloadSchema = ChallengeBodySchema.extend({
  checksum: z.string().min(6)
});

export type ChallengePayload = z.infer<typeof ChallengePayloadSchema>;

export type ChallengeDecodeResult =
  | { ok: true; payload: ChallengePayload }
  | { ok: false; reason: "missing" | "invalid" | "unsupported"; message: string };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumForBody(body: z.infer<typeof ChallengeBodySchema>): string {
  let hash = 2166136261;
  const text = canonical(body);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeChallenge(payload: Omit<ChallengePayload, "schemaVersion" | "game" | "checksum">): string {
  const body = ChallengeBodySchema.parse({
    schemaVersion: CHALLENGE_SCHEMA_VERSION,
    game: "worldprint",
    ...payload
  });
  return toBase64Url(JSON.stringify({ ...body, checksum: checksumForBody(body) }));
}

export function decodeChallenge(code: string | null | undefined): ChallengeDecodeResult {
  if (!code) {
    return { ok: false, reason: "missing", message: "This challenge link is missing its code." };
  }
  try {
    const parsed = JSON.parse(fromBase64Url(code)) as unknown;
    const schemaVersion = z.object({ schemaVersion: z.string().optional() }).safeParse(parsed).data?.schemaVersion;
    if (schemaVersion && schemaVersion !== CHALLENGE_SCHEMA_VERSION) {
      return {
        ok: false,
        reason: "unsupported",
        message: "This challenge uses an older format that this static build cannot open."
      };
    }
    const payload = ChallengePayloadSchema.parse(parsed);
    const body = ChallengeBodySchema.parse(payload);
    if (payload.checksum !== checksumForBody(body)) {
      return { ok: false, reason: "invalid", message: "This challenge code did not pass its checksum." };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid", message: "This challenge code is not valid." };
  }
}

export function challengePayloadFromRun(run: RunState): Omit<ChallengePayload, "schemaVersion" | "game" | "checksum"> {
  const datedKind = run.mode === "daily" || run.mode === "archive";
  return {
    kind: datedKind ? "daily" : "practice",
    contentVersion: run.contentVersion,
    tier: run.tier,
    roundIds: run.rounds.map((round) => round.roundId),
    dateKey: datedKind ? run.dateKey : undefined
  };
}

export function challengeTitle(tier: Tier): string {
  return `Can You Geo? Challenge · Mystery Map · ${tier}`;
}
