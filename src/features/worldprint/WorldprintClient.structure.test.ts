import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/worldprint/WorldprintClient.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

describe("WorldprintClient UI structure", () => {
  it("makes the lobby default action a dominant PLAY CTA", () => {
    const primaryIndex = source.indexOf('className="lobby-primary-card"');
    const playIndex = source.indexOf('<span className="lobby-play-main">PLAY</span>');
    const secondaryIndex = source.indexOf('className="lobby-secondary"');

    expect(primaryIndex).toBeGreaterThan(0);
    expect(playIndex).toBeGreaterThan(primaryIndex);
    expect(secondaryIndex).toBeGreaterThan(playIndex);
    expect(source).toContain('aria-label="Primary Mystery Map action"');
    expect(source).toContain('<small>{primaryActionLabel}</small>');
    expect(source).not.toContain("Compass size={20}");
    expect(styles).toContain(".lobby-play-button");
    expect(styles).toContain(".lobby-play-main");
    expect(styles).toContain("min-height: 5rem");
    expect(styles).toContain("justify-items: center");
  });

  it("keeps Practice, Past Games, replay, and stats visually secondary in the lobby", () => {
    expect(source).toContain("More ways to play");
    expect(source).toContain('aria-label="More ways to play"');
    expect(source).toContain('className="lobby-secondary-actions"');
    expect(source).toContain("Practice Atlas");
    expect(source).toContain("Past Games");
    expect(source).toContain("View saved stats");
    expect(source).toContain("Replay for practice");
    expect(styles).toContain(".mode-card-grid-secondary .mode-card");
  });

  it("gives completed Daily players a clear next action and makes result viewing explicit", () => {
    expect(source).toContain("Today's maps complete");
    expect(source).toContain('const completedPrimaryLabel = signedIn && practiceMatches.length > 0 ? "Play" : "Play Sample Run";');
    expect(source).toContain(`const resultActionLabel = completedDailyRun ? "View today's result" : "View saved stats";`);
    expect(source).toContain("setRun(completedDailyRun);");
    expect(source).toContain("window.requestAnimationFrame(() => window.scrollTo(0, 0));");
  });

  it("keeps the unit clue visible in the immediate answer flow", () => {
    const answerBoxIndex = source.indexOf('className="answer-box primary-answer-box"');
    const unitClueIndex = source.indexOf('className="answer-clue-row"');
    const choiceListIndex = source.indexOf('className="choice-list"');
    const lowerClueDashboardIndex = source.indexOf('className="clue-dashboard"');

    expect(unitClueIndex).toBeGreaterThan(answerBoxIndex);
    expect(unitClueIndex).toBeLessThan(choiceListIndex);
    expect(unitClueIndex).toBeLessThan(lowerClueDashboardIndex);
    expect(source).toContain('data-clue="unit"');
    expect(source).toContain("Reveal units");
    expect(source).toContain("Reveal unit: -");
    expect(source).toContain('dispatch({ type: "unitClue" })');
    expect(styles).toContain(".answer-clue-row");
    expect(styles).toContain(".answer-unit-button");
  });

  it("shows every paid country reveal in a horizontal evidence strip", () => {
    expect(source).toContain("const revealedEvidence = roundState.investigations.filter((item) => item.cost > 0);");
    expect(source).toContain('aria-label="Revealed country evidence"');
    expect(source).toContain('className="revealed-country-chip"');
    expect(source).toContain("Compare the countries you spent points to reveal.");
    expect(source).not.toContain("{latestInvestigation ? (");
    expect(styles).toContain(".revealed-country-strip");
    expect(styles).toContain("grid-auto-flow: column");
    expect(styles).toContain("overflow-x: auto");
  });

  it("lets the indicator question use the full answer panel width", () => {
    expect(source).toContain("<h2>Which indicator is this?</h2>");
    expect(styles).toContain(".answer-box-heading");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(styles).toContain(".answer-box-heading > div");
    expect(styles).toContain("justify-self: end");
  });

  it("renames the confusing Banked HUD to a clear saved-score summary", () => {
    expect(source).toContain("Saved score");
    expect(source).toContain("No maps solved yet.");
    expect(source).toContain("completed map");
    expect(source).not.toContain("<span>Banked</span>");
    expect(source).not.toContain("from {bankedMapLabel}");
  });

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
    expect(styles).toContain(".round-result-banner .correct-answer-line");
    expect(styles).toContain("padding-top: 0.72rem");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(styles).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));");
    expect(styles).toContain("grid-template-columns: repeat(auto-fit, minmax(5.2rem, 1fr));");
    expect(styles).toContain("word-break: break-word");
  });

  it("makes generic post-challenge play leave the challenge context", () => {
    expect(source).toContain('router.push("/play/mystery-map/#practice-atlas")');
    expect(source).toContain("Play another set");
    expect(source).toContain('run.mode === "challenge" ? "Replay this challenge" : "Replay for practice"');
  });

  it("wires only high-level launch analytics events without answer labels", () => {
    expect(source).toContain("trackCanYouGeoEvent");
    expect(source).toContain('"cgy_game_start"');
    expect(source).toContain('"cgy_round_answered"');
    expect(source).toContain('"cgy_game_complete"');
    expect(source).toContain('"cgy_share_clicked"');
    expect(source).toContain('"cgy_challenge_created"');
    expect(source).toContain("round_number: current.currentRoundIndex + 1");
    expect(source).not.toContain('answer_label');
    expect(source).not.toContain('indicator_id');
  });

  it("keeps the challenge email modal padded and readable across widths", () => {
    expect(source).toContain('className="challenge-email-modal surface"');
    expect(source).toContain("Send challenge by email");
    expect(styles).toContain(".challenge-email-modal");
    expect(styles).toContain("padding: clamp(1.2rem, 3vw, 1.75rem)");
    expect(styles).toContain(".challenge-email-modal-head");
    expect(styles).toContain(".challenge-email-modal-head .button-secondary");
    expect(styles).toContain("@media (min-width: 560px)");
    expect(styles).toContain("white-space: nowrap");
  });
});
