import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/worldprint/WorldprintClient.tsx"), "utf8");
const primaryNavSource = readFileSync(join(process.cwd(), "src/components/PrimaryNav.tsx"), "utf8");
const playLobbyNavigationSource = readFileSync(join(process.cwd(), "src/lib/site/playLobbyNavigation.ts"), "utf8");
const runStateSource = readFileSync(join(process.cwd(), "src/lib/game/state.ts"), "utf8");
const storageSource = readFileSync(join(process.cwd(), "src/lib/persistence/storage.ts"), "utf8");
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
    expect(source).toContain("Sign up for Pro for the full atlas, or create a free account for Daily rounds in Daily-enabled games.");
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

  it("gates Practice access as Pro-only and hides filters from Free players", () => {
    expect(source).toContain("const canUseFullPractice = signedIn && entitlement.capabilities.canUseFullPractice;");
    expect(source).toContain("const fullPracticeMatches = useMemo");
    expect(source).toContain("const practiceMatches = canUseFullPractice ? fullPracticeMatches : [];");
    expect(source).not.toContain("const limitedPracticeLimit");
    expect(source).not.toContain("const limitedPracticeMatches");
    expect(source).not.toContain("function selectLimitedPracticeRoundIds");
    expect(source).not.toContain("LIMITED_PRACTICE_FILTERS");
    expect(source).toContain("if (!canUseFullPractice) return;");
    expect(source).toContain('if (mode === "practice" && !canUseFullPractice) return;');
    expect(source).toContain('{canUseFullPractice ? (');
    expect(source).toContain('className="practice-filters"');
    expect(source).not.toContain("Limited Practice");
    expect(source).not.toContain("Start limited practice");
    expect(source).toContain("Pro feature");
    expect(source).toContain("Practice by topic and difficulty is included with Pro.");
    expect(source).toContain("Free accounts include Daily rounds in Daily-enabled games.");
    expect(source).toContain("Full Practice Atlas");
    expect(source).toContain('href="/sign-up"');
    expect(source).toContain("Create free account");
    expect(source).toContain('href="/upgrade"');
    expect(source).toContain("Start Pro");
  });

  it("surfaces resumable Daily, Atlas, Pro Practice, and Past Game runs from local storage", () => {
    expect(source).toContain("store.activeDailyRun");
    expect(source).toContain("store.activeAtlasRun");
    expect(source).toContain("store.activePracticeRun");
    expect(source).toContain("store.activeArchiveRunsByDate[todayKey]");
    expect(source).toContain("if (!data || !canUseFullPractice) return null;");
    expect(source).toContain(
      "const currentPracticeActive = canUseFullPractice && currentPracticeRun?.status === \"active\" && runMatchesTier(currentPracticeRun, selectedTier);",
    );
    expect(source).toContain("currentPracticeRun?.status === \"active\"");
    expect(source).toContain("Resume practice");
    expect(source).toContain("Resume map");
    expect(source).toContain("Daily in progress");
    expect(source).toContain("Resume today's 3 maps");
    expect(source).toContain("Continue Pro Atlas");
    expect(source).toContain("Continue replay");
  });

  it("keeps resumed runs aligned to the selected skill tier", () => {
    expect(source).toContain("function runMatchesTier(run: RunState | null | undefined, tier: Tier)");
    expect(source).toContain("const targetTier = challengePayload?.tier ?? selectedTier;");
    expect(source).toContain("runMatchesTier(currentDailyRun, targetTier)");
    expect(source).toContain("runMatchesTier(currentAtlasRun, targetTier)");
    expect(source).toContain("runMatchesTier(currentPracticeRun, targetTier)");
    expect(source).toContain("runMatchesTier(currentArchiveRun, targetTier)");
    expect(source).toContain("tier: targetTier");
    expect(source).toContain("const currentDailyActive = currentDailyRun?.status === \"active\" && runMatchesTier(currentDailyRun, selectedTier);");
    expect(source).toContain("const currentAtlasActive = currentAtlasRun?.status === \"active\" && runMatchesTier(currentAtlasRun, selectedTier);");
    expect(source).toContain("const activeDateRunMatchesTier = activeDateRun?.status === \"active\" && runMatchesTier(activeDateRun, selectedTier);");
  });

  it("ties the active tier pill and answer mode to the actual run tier", () => {
    expect(source).toContain("const config = TIER_CONFIGS[run.tier]");
    expect(source).toContain("function activeRunContextChips(run: RunState, rulesetLabel: string)");
    expect(source).toContain("const rulesChip = `${rulesetLabel} rules`;");
    expect(source).toContain("const activeContextChips = activeRunContextChips(run, config.label);");
    expect(source).toContain("activeContextChips.map");
    expect(source).toContain('run.tier === "atlasMaster" ? (');
    expect(source).toContain('className="choice-list"');
    expect(source).toContain('Search playable map catalog');
    expect(source).toContain('className="master-suggestion-list"');
    expect(source).toContain('data-testid="atlas-master-suggestions"');
    expect(source).not.toContain("<datalist");
  });

  it("stores Custom Atlas setup metadata and renders it on active practice runs", () => {
    expect(runStateSource).toContain("export type RunSetupMetadata");
    expect(runStateSource).toContain('kind: "custom-atlas";');
    expect(runStateSource).toContain("topic?: string;");
    expect(runStateSource).toContain("mapDifficulty?: IndicatorDifficulty;");
    expect(runStateSource).toContain("setup?: RunSetupMetadata;");
    expect(storageSource).toContain("const RunSetupMetadataSchema");
    expect(storageSource).toContain("mapDifficulty: IndicatorDifficultySchema.optional()");
    expect(storageSource).toContain("setup: RunSetupMetadataSchema.optional()");
    expect(source).toContain("function customAtlasSetup(topic: string, mapDifficulty: IndicatorDifficulty): RunSetupMetadata");
    expect(source).toContain("setup: customAtlasSetup(practiceCategory, practiceDifficulty)");
    expect(source).toContain('run.setup?.kind === "custom-atlas"');
    expect(source).toContain('"Custom Atlas"');
    expect(source).toContain("formatTopicLabel(run.setup.topic)");
    expect(source).toContain("`${DIFFICULTY_LABELS[run.setup.mapDifficulty]} maps`");
    expect(source).toContain('"Atlas Run"');
    expect(source).not.toContain("Mystery Map Practice");
  });

  it("clarifies the Pro-only practice shuffle action", () => {
    expect(source).toContain("function practiceFilterCombinations");
    expect(source).toContain("function shufflePracticeMaps()");
    expect(source).toContain("if (!canUseFullPractice) return;");
    expect(source).toContain("const alternatives = combinations.filter");
    expect(source).toContain("setPracticeCategory(selected.category);");
    expect(source).toContain("setPracticeDifficulty(selected.difficulty);");
    expect(source).toContain("setPracticeSetRoundIds(selectedIds);");
    expect(source).toContain("!options.practiceRoundIds");
    expect(source).toContain("selectedPracticeRounds.length === 0");
    expect(source).toContain("onClick={shufflePracticeMaps}");
    expect(source).toContain('aria-label="Shuffle practice maps"');
    expect(source).toContain("Shuffle maps");
    expect(source).toContain("Picks a random topic and difficulty for your next practice set.");
    expect(source).not.toContain("Shuffle set");
    expect(source).not.toContain("Gets a different mix for this topic and difficulty.");
    expect(styles).toContain(".practice-action-note");
    expect(styles).toContain(".practice-actions .practice-shuffle-button");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(styles).toContain("min-height: 4.25rem");
  });

  it("moves the skill tier up into the start-page preview column", () => {
    const startPageIndex = source.indexOf(
      'data-entry-mode={isArchiveDate ? "archive" : "daily"}',
    );
    const entryCopyIndex = source.indexOf('className="entry-copy"', startPageIndex);
    const entryPanelIndex = source.indexOf('className="entry-panel surface"', entryCopyIndex);
    const entryCopySource = source.slice(entryCopyIndex, entryPanelIndex);
    const movedTierIndex = source.indexOf(
      'className="setup-section setup-section-compact entry-skill-tier"',
      entryCopyIndex,
    );

    expect(movedTierIndex).toBeGreaterThan(entryCopyIndex);
    expect(movedTierIndex).toBeLessThan(entryPanelIndex);
    expect(entryCopySource).not.toContain('className="entry-facts"');
    expect(entryCopySource).not.toContain('className="entry-lobby-strip"');
    expect(source.match(/Sets the answer list, clues, and investigations for Daily, Practice, and replays\./g)).toHaveLength(1);
    expect(styles).toContain(".entry-skill-tier");
  });

  it("keeps saved stats inside the Past Games card instead of as a stray side-route button", () => {
    const secondaryActionsIndex = source.indexOf('className="lobby-secondary-actions"');
    const secondaryActionsEnd = source.indexOf('className="mode-card-grid mode-card-grid-secondary"', secondaryActionsIndex);
    const secondaryActionsSource = source.slice(secondaryActionsIndex, secondaryActionsEnd);
    const pastCardIndex = source.indexOf('className="mode-card mode-card-past"');
    const pastCardEnd = source.indexOf("</article>", pastCardIndex);
    const pastCardSource = source.slice(pastCardIndex, pastCardEnd);

    expect(secondaryActionsSource).not.toContain("View saved stats");
    expect(pastCardSource).toContain("Open past games");
    expect(pastCardSource).toContain("View saved stats");
    expect(pastCardSource).toContain("Replays never change today's Daily score or streak.");
    expect(pastCardSource).not.toContain("today&apos;s");
  });

  it("lets preview and reveal text use their full padded card width", () => {
    expect(styles).toContain(".entry-preview-copy");
    expect(styles).toContain(".entry-preview-copy h2");
    expect(styles).toContain(".entry-preview-copy p:not(.setup-kicker)");
    expect(styles).toContain(".reveal-map h1");
    expect(styles).toContain("max-width: none;");
    expect(styles).toContain(".round-result-banner strong");
    expect(styles).toContain("width: 100%");
  });

  it("gives completed Daily players a clear next action and makes result viewing explicit", () => {
    expect(source).toContain("Today's maps complete");
    expect(source).toContain('const completedPrimaryLabel = isFreeAccount ? "Start Pro" : signedIn && practiceMatches.length > 0 ? "Play" : "Play Sample Run";');
    expect(source).toContain("const isFreeDailyRun = isDailyRun && signedIn && !canUseFullPractice;");
    expect(source).toContain("You've used today's free Mystery Map rounds.");
    expect(source).toContain("Go Pro to keep playing unlimited Atlas runs, or choose another game in the Can You Geo library.");
    expect(source).toContain('href="/play"');
    expect(source).toContain("canReplayForPractice");
    expect(source).toContain("canUseFullPractice={canUseFullPractice}");
    expect(source).toContain('if (sourceRun.mode === "daily" && !canUseFullPractice) return;');
    expect(source).toContain(`const resultActionLabel = completedDailyRun ? "View today's result" : "View saved stats";`);
    expect(source).toContain("setRun(completedDailyRun);");
    expect(source).toContain("window.requestAnimationFrame(() => window.scrollTo(0, 0));");
    expect(source).toContain('href="/account/stats#saved-stats"');
    expect(source).toContain("?review=1#past-game-result");
    expect(source).toContain('id="past-game-result"');
    expect(styles).toContain("#saved-stats");
    expect(styles).toContain("#past-game-result");
    expect(styles).toContain("scroll-margin-top: 6rem;");
  });

  it("distinguishes Pro Atlas from today's Daily Challenge in the Pro lobby", () => {
    expect(source).toContain("Start Unlimited Atlas");
    expect(source).toContain("Start unlimited 5-map Pro Atlas runs from the approved Mystery Map pool.");
    expect(source).toContain("Pro Atlas uses unlimited");
    expect(source).toContain("Daily Challenge is today's fixed 3-map streak run.");
    expect(source).toContain("Play today&apos;s Daily Challenge");
    expect(source).not.toContain("Play today&apos;s 3 maps");
  });

  it("keeps Play pointed at the hub while preserving Mystery Map same-route lobby reset", () => {
    expect(primaryNavSource).toContain('href: "/play"');
    expect(primaryNavSource).not.toContain('href: "/play/mystery-map"');
    expect(primaryNavSource).toContain("isMysteryMapPlayPath(pathname)");
    expect(primaryNavSource).toContain("event.preventDefault();");
    expect(primaryNavSource).toContain("dispatchPlayLobbyRequest();");
    expect(playLobbyNavigationSource).toContain('PLAY_LOBBY_REQUEST_EVENT = "canyougeo:play-lobby-request"');
    expect(playLobbyNavigationSource).toContain('return normalized === "/play/mystery-map";');
    expect(source).toContain("window.addEventListener(PLAY_LOBBY_REQUEST_EVENT, handlePlayLobbyRequest)");
    expect(source).toContain("returnToLobby();");
    expect(source).not.toContain("runState=");
    expect(source).not.toContain("answerIds=");
    expect(source).not.toContain("hiddenIndicator");
  });

  it("keeps the unit clue visible in the immediate answer flow", () => {
    const mapPanelIndex = source.indexOf('className="play-map-panel"');
    const actionDockIndex = source.indexOf('className="play-action-dock surface"');
    const answerBoxIndex = source.indexOf('className="answer-box primary-answer-box"', actionDockIndex);
    const unitClueIndex = source.indexOf('className="answer-clue-row"', actionDockIndex);
    const choiceListIndex = source.indexOf('className="choice-list"', actionDockIndex);
    const lowerClueDashboardIndex = source.indexOf('className="clue-dashboard"');

    expect(actionDockIndex).toBeGreaterThan(mapPanelIndex);
    expect(answerBoxIndex).toBeGreaterThan(actionDockIndex);
    expect(lowerClueDashboardIndex).toBeLessThan(actionDockIndex);
    expect(unitClueIndex).toBeGreaterThan(answerBoxIndex);
    expect(unitClueIndex).toBeLessThan(choiceListIndex);
    expect(source).toContain('data-clue="unit"');
    expect(source).toContain('data-placement="dock"');
    expect(source).toContain("Reveal units");
    expect(source).toContain("Reveal unit: -");
    expect(source).toContain('dispatch({ type: "unitClue" })');
    expect(styles).toContain(".answer-clue-row");
    expect(styles).toContain(".answer-unit-button");
  });

  it("renders active answers in a compact gameplay action dock", () => {
    const actionDockIndex = source.indexOf('className="play-action-dock surface"');
    const answerBoxIndex = source.indexOf('className="answer-box primary-answer-box"', actionDockIndex);
    const choiceListIndex = source.indexOf('className="choice-list"', actionDockIndex);
    const controlPanelIndex = source.indexOf('className="play-control-panel surface"');

    expect(actionDockIndex).toBeGreaterThan(0);
    expect(answerBoxIndex).toBeGreaterThan(actionDockIndex);
    expect(choiceListIndex).toBeGreaterThan(answerBoxIndex);
    expect(answerBoxIndex).toBeGreaterThan(controlPanelIndex);
    expect(styles).toContain(".play-action-dock");
    expect(styles).toContain(".play-action-dock .choice-list");
    expect(styles).toContain(".play-layout[data-layout=\"dashboard\"] .play-action-dock");
    expect(styles).toContain("box-shadow: none");
    expect(styles).toContain(".play-action-dock .primary-answer-box");
    expect(styles).toContain("position: sticky;");
  });

  it("keeps the current map score label from splitting inside available", () => {
    expect(source).toContain('className="score-status-word"');
    expect(styles).toContain(".score-hud-current strong .score-status-word");
    expect(styles).toContain("display: inline-block");
    expect(styles).toContain("white-space: nowrap");
    expect(styles).toContain("overflow-wrap: normal");
    expect(styles).toContain("font-size: clamp(0.86rem, 1.45vw, 1.06rem)");
  });

  it("places solved-round next action before the longer explanation", () => {
    const revealDockIndex = source.indexOf('className="reveal-action-dock"');
    const nextButtonIndex = source.indexOf('className="button full-width next-map-button"', revealDockIndex);
    const explanationIndex = source.indexOf('className="lesson-card lesson-card-strong reveal-key-evidence"', revealDockIndex);

    expect(revealDockIndex).toBeGreaterThan(0);
    expect(nextButtonIndex).toBeGreaterThan(revealDockIndex);
    expect(nextButtonIndex).toBeLessThan(explanationIndex);
    expect(source).toContain('<summary id="showing-heading">What the map was showing</summary>');
    expect(styles).toContain(".reveal-action-dock");
    expect(styles).toContain(".next-map-button");
    expect(styles).toContain("next-button-ready");
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
    expect(styles).toContain(".selected-country-action-card");
    expect(styles).toContain("position: static");
  });

  it("uses a simplified challenge sharing card with hidden raw share text by default", () => {
    const quickCardIndex = source.indexOf('className="challenge-quick-card surface"');
    const detailedCardIndex = source.indexOf('className="daily-share-card challenge-friend-card surface"', quickCardIndex);
    const quickCardSource = source.slice(quickCardIndex, detailedCardIndex);
    const detailedCardSource = source.slice(detailedCardIndex, source.indexOf('className="share-preview-disclosure"', detailedCardIndex));

    expect(source).toContain("const canCreateChallenge = !isSampleRun;");
    expect(quickCardIndex).toBeGreaterThan(0);
    expect(detailedCardIndex).toBeGreaterThan(quickCardIndex);
    expect(quickCardSource).toContain('aria-label="Quick challenge actions"');
    expect(quickCardSource).toContain("Send this exact Mystery Map set with no answers, countries, indicators, or source labels revealed before play.");
    expect(quickCardSource).toContain("<h2>Challenge a friend</h2>");
    expect(quickCardSource).toContain("openChallengeInviteModal");
    expect(quickCardSource).toContain("copyChallengeLink");
    expect(quickCardSource).toContain("Copy link");
    expect(quickCardSource).toContain("Challenge link copied.");
    expect(quickCardSource).toContain('className="challenge-quick-status daily-share-copy-status"');
    expect(quickCardSource).not.toContain("Share challenge");
    expect(quickCardSource).not.toContain("shareChallenge");
    expect(source).toContain("openChallengeInviteModal");
    expect(source).toContain("Send challenge by email");
    expect(source).toContain("Friend&apos;s email");
    expect(source).toContain("requestChallengeEmailInvite");
    expect(source).toContain("nativeShareAvailable");
    expect(source).toContain('setNativeShareAvailable(typeof navigator.share === "function")');
    expect(detailedCardSource).toContain("nativeShareAvailable ? (");
    expect(detailedCardSource).toContain("Share challenge");
    expect(detailedCardSource).toContain("Copy link");
    expect(source).toContain("<Mail");
    expect(source).toContain('className="share-preview-disclosure"');
    expect(source).toContain("Preview share text");
    expect(source).toContain('aria-label="Spoiler-free share text preview"');
    expect(styles).toContain(".challenge-quick-card");
    expect(styles).toContain(".challenge-quick-actions");
    expect(styles).toContain(".challenge-quick-status");
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
