import { describe, expect, it } from "vitest";
import { encodeChallenge } from "@/lib/game/challenge";
import {
  buildChallengeInviteEmail,
  buildResendChallengeInviteRequest,
  challengeInviteRateLimitExceeded,
  decodeChallengeInviteCode,
  normalizeInviteMessage,
  parseChallengeInviteRequest,
  sha256Hex
} from "./challengeInvites";

const validChallengeCode = encodeChallenge({
  kind: "daily",
  contentVersion: "2026.06.30-test",
  tier: "analyst",
  roundIds: ["round-a", "round-b", "round-c"],
  dateKey: "2026-06-30",
  challenger: {
    score: 2400,
    possible: 3000,
    rankTitle: "Pattern Hunter",
    solvedCount: 3,
    roundCount: 3,
    strip: "🟩🟨🟥"
  }
});

const validPracticeChallengeCode = encodeChallenge({
  kind: "practice",
  contentVersion: "2026.06.30-test",
  tier: "analyst",
  roundIds: ["round-a", "round-b", "round-c"],
  challenger: {
    score: 500,
    possible: 3000,
    rankTitle: "Signal Seeker",
    solvedCount: 3,
    roundCount: 3,
    strip: "🟥🟥🟥"
  }
});

describe("challenge invite helpers", () => {
  it("accepts valid invite JSON and normalizes the recipient without adding marketing data", () => {
    const parsed = parseChallengeInviteRequest({
      contentType: "application/json",
      bodyText: JSON.stringify({
        challengeCode: validChallengeCode,
        recipientEmail: " Friend+Geo@Example.COM ",
        message: "Beat this score if you can."
      })
    });

    expect(parsed.error).toBeNull();
    expect(parsed.invite).toMatchObject({
      recipientEmail: "friend+geo@example.com",
      recipientDomain: "example.com",
      message: "Beat this score if you can."
    });
    expect(parsed.invite?.payload.challenger?.rankTitle).toBe("Pattern Hunter");
    expect(JSON.stringify(parsed.invite)).not.toContain("marketing");
  });

  it("accepts current practice and challenge result codes without date keys", () => {
    const decoded = decodeChallengeInviteCode(validPracticeChallengeCode);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.payload.kind).toBe("practice");
    expect(decoded.payload.dateKey).toBeUndefined();
    expect(decoded.payload.challenger).toMatchObject({
      score: 500,
      possible: 3000,
      rankTitle: "Signal Seeker"
    });
  });

  it("rejects unactionable email addresses, invalid challenge codes, and raw solution-shaped fields", () => {
    expect(
      parseChallengeInviteRequest({
        contentType: "application/json",
        bodyText: JSON.stringify({ challengeCode: validChallengeCode, recipientEmail: "not an email" })
      }).error
    ).toBe("Enter a single valid friend email.");

    expect(
      parseChallengeInviteRequest({
        contentType: "application/json",
        bodyText: JSON.stringify({ challengeCode: "not-a-real-code", recipientEmail: "friend@example.com" })
      }).error
    ).toBe("Challenge code is not valid.");

    expect(
      parseChallengeInviteRequest({
        contentType: "application/json",
        bodyText: JSON.stringify({
          challengeCode: validChallengeCode,
          recipientEmail: "friend@example.com",
          answerCountries: ["Brazil"]
        })
      }).error
    ).toBe("Challenge invite request includes unsupported fields.");
  });

  it("keeps optional notes short, simple, and spoiler-aware", () => {
    expect(normalizeInviteMessage("Nice read.\n\n\nTry this.")).toEqual({ ok: true, message: "Nice read.\n\nTry this." });
    expect(normalizeInviteMessage("The correct country is Brazil.")).toEqual({ ok: false, error: "Keep the note spoiler-free." });
    expect(normalizeInviteMessage("Read this: https://example.com")).toEqual({
      ok: false,
      error: "Keep the note simple. Links and email addresses are not allowed."
    });
  });

  it("builds a spoiler-safe Resend email payload without storing contacts or exposing secrets in the body", () => {
    const decoded = decodeChallengeInviteCode(validChallengeCode);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    const email = buildChallengeInviteEmail({
      config: {
        fromEmail: "Can You Geo Challenges <challenge@mail.canyougeo.com>",
        siteUrl: "https://test.canyougeo.com"
      },
      recipientEmail: "friend@example.com",
      challengeCode: validChallengeCode,
      message: "I found a good one.",
      payload: decoded.payload
    });
    const request = buildResendChallengeInviteRequest({ apiKey: "re_secret_test", email });
    const body = JSON.parse(String(request.init.body)) as Record<string, unknown>;

    expect(request.url).toBe("https://api.resend.com/emails");
    expect(body.from).toBe("Can You Geo Challenges <challenge@mail.canyougeo.com>");
    expect(body.to).toEqual(["friend@example.com"]);
    expect(body.subject).toBe("Can You Geo Mystery Map challenge: 2,400 to beat");
    expect(body.text).toEqual(expect.any(String));
    expect(body.html).toEqual(expect.any(String));
    expect(email.text).toContain("2,400 out of 3,000");
    expect(email.text).toContain("https://test.canyougeo.com/challenge/mystery-map/?c=");
    expect(email.html).toContain("A friend challenged you on Can You Geo.");
    expect(email.html).toContain("Play the challenge");
    expect(email.html).toContain('href="https://test.canyougeo.com/challenge/mystery-map/?c=');
    expect(email.html).toContain("Button not working? Copy this challenge link:");
    expect(email.html).toContain("same spoiler-free map set");
    expect(email.html).toContain("No spoilers");
    expect(email.html).toContain("#000411");
    expect(email.html).toContain("#03222D");
    expect(email.html).toContain("#0FD8DB");
    expect(email.html).toContain("#C2ED39");
    const htmlCtaIndex = email.html.indexOf("Play the challenge");
    const htmlFallbackIndex = email.html.indexOf("Button not working? Copy this challenge link:");
    const htmlUrlIndex = email.html.indexOf("https://test.canyougeo.com/challenge/mystery-map/?c=", htmlFallbackIndex);
    const htmlNoteIndex = email.html.indexOf("Their note");
    expect(htmlCtaIndex).toBeGreaterThan(0);
    expect(htmlFallbackIndex).toBeGreaterThan(htmlCtaIndex);
    expect(htmlUrlIndex).toBeGreaterThan(htmlFallbackIndex);
    expect(htmlUrlIndex).toBeLessThan(htmlNoteIndex);
    const textUrlIndex = email.text.indexOf("https://test.canyougeo.com/challenge/mystery-map/?c=");
    const textNoteIndex = email.text.indexOf("Their note:");
    expect(textUrlIndex).toBeGreaterThan(0);
    expect(textUrlIndex).toBeLessThan(textNoteIndex);
    expect(email.text).toContain("not added to any marketing list");
    expect(email.html).toContain("not added to any marketing list");
    expect(email.text).not.toMatch(/Brazil|Japan|World Bank|api\.worldbank|hidden indicator/i);
    expect(email.html).not.toMatch(/Brazil|Japan|World Bank|api\.worldbank|hidden indicator/i);
    expect(String(request.init.body)).not.toContain("re_secret_test");
    expect(String(request.init.body)).not.toContain("audience");
  });

  it("enforces conservative rate limit decisions and hashes recipient data", async () => {
    expect(challengeInviteRateLimitExceeded(4, 5)).toBe(false);
    expect(challengeInviteRateLimitExceeded(5, 5)).toBe(true);
    await expect(sha256Hex("friend@example.com")).resolves.toMatch(/^[a-f0-9]{64}$/);
  });
});
