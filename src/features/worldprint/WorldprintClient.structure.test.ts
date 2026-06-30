import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/worldprint/WorldprintClient.tsx"), "utf8");

describe("WorldprintClient UI structure", () => {
  it("keeps selected-country reveal action in the immediate/top gameplay layout", () => {
    const selectedActionIndex = source.indexOf('className="selected-country-card selected-country-action-card"');
    const scoreHudIndex = source.indexOf('className="score-hud"');
    const runStatsIndex = source.indexOf('className="run-stats-card"');
    const investigationBoxIndex = source.indexOf('className="investigation-box"');

    expect(selectedActionIndex).toBeGreaterThan(0);
    expect(selectedActionIndex).toBeLessThan(scoreHudIndex);
    expect(selectedActionIndex).toBeLessThan(runStatsIndex);
    expect(selectedActionIndex).toBeLessThan(investigationBoxIndex);
    expect(source).toContain('data-layout="immediate"');
    expect(source).toContain("selected-country-reveal-button");
    expect(source).toContain("Reveal from the selected-country panel above");
  });

  it("uses a simplified challenge sharing card with hidden raw share text by default", () => {
    expect(source).toContain("<h2>Challenge a friend</h2>");
    expect(source).toContain("openChallengeInviteModal");
    expect(source).toContain("Send challenge by email");
    expect(source).toContain("Friend&apos;s email");
    expect(source).toContain("requestChallengeEmailInvite");
    expect(source).toContain("Share challenge");
    expect(source).toContain("Copy link");
    expect(source).toContain("<Mail");
    expect(source).toContain('className="share-preview-disclosure"');
    expect(source).toContain("Preview share text");
    expect(source).toContain('aria-label="Spoiler-free share text preview"');
    expect(source).not.toContain('className="share-action-grid"');
    expect(source).not.toContain(">Copy challenge link<");
  });

  it("keeps challenge landing social, streak-safe, and spoiler-safe before play", () => {
    expect(source).toContain("Can you beat this map set?");
    expect(source).toContain("This Mystery Map link locks the exact maps and skill tier.");
    expect(source).toContain("official Daily score or streak");
    expect(source).toContain("no answer labels, countries, or round solutions");
    expect(source).toContain("Play the challenge");
  });

  it("marks reveal result text and stat cells with overflow-resistant hooks", () => {
    expect(source).toContain("correct-answer-line");
    expect(source).toContain('className="point-breakdown"');
  });
});
