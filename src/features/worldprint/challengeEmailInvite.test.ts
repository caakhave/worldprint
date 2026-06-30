import { describe, expect, it, vi } from "vitest";
import { challengeEmailErrorCopy, requestChallengeEmailInvite } from "@/features/worldprint/challengeEmailInvite";

type InviteMockClient = {
  auth: { getSession: ReturnType<typeof vi.fn> };
  functions: { invoke: ReturnType<typeof vi.fn> };
};

function inviteClientMock(): InviteMockClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "challenge-token" } }, error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { ok: true, remaining: 4 }, error: null })
    }
  };
}

describe("challengeEmailInvite client helper", () => {
  it("requires a signed-in Supabase session before invoking the Edge Function", async () => {
    await expect(
      requestChallengeEmailInvite({
        client: null,
        signedIn: false,
        challengeCode: "code",
        recipientEmail: "friend@example.com",
        message: ""
      })
    ).resolves.toEqual({
      ok: false,
      message: "Sign in to send a challenge email.",
      remaining: null
    });
  });

  it("calls only the safe challenge email function with a JWT and no raw answer data", async () => {
    const client = inviteClientMock();

    await expect(
      requestChallengeEmailInvite({
        client: client as never,
        signedIn: true,
        challengeCode: "safe-code",
        recipientEmail: "friend@example.com",
        message: "Try this one."
      })
    ).resolves.toEqual({
      ok: true,
      message: "Challenge email sent.",
      remaining: 4
    });

    expect(client.functions.invoke).toHaveBeenCalledWith("send-challenge-email", {
      headers: { Authorization: "Bearer challenge-token" },
      body: {
        challengeCode: "safe-code",
        recipientEmail: "friend@example.com",
        message: "Try this one."
      }
    });
    expect(JSON.stringify(client.functions.invoke.mock.calls[0])).not.toMatch(/answerCountries|correctIndicatorId|stripe|service_role/i);
  });

  it("keeps user-facing error copy distinct and safe", () => {
    expect(challengeEmailErrorCopy("Daily challenge email limit reached.")).toBe(
      "Daily email limit reached. Use share, copy, or mailto for now."
    );
    expect(challengeEmailErrorCopy("Missing server env: RESEND_API_KEY")).toBe(
      "Challenge email is not available yet. Use copy link or mailto for now."
    );
    expect(challengeEmailErrorCopy("Enter a single valid friend email.")).toBe("Enter one valid friend email.");
    expect(challengeEmailErrorCopy("Keep the note spoiler-free.")).toBe("Keep the note spoiler-free.");
  });
});
