"use client";

import { Compass, Copy, Lightbulb, Search, Share2, Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntryAtlasVisual } from "@/features/worldprint/EntryAtlasVisual";
import { TierSelector } from "@/features/worldprint/TierSelector";
import {
  loadEntityRegistry,
  loadIndicator,
  loadDailyManifest,
  loadManifest,
  loadMap,
  loadRounds
} from "@/lib/content/loaders";
import type {
  DailyManifest,
  Entity,
  IndicatorDifficulty,
  IndicatorArtifact,
  IndicatorSummary,
  Manifest,
  MapFeatureCollection,
  RoundDefinition
} from "@/lib/content/schemas";
import type { Tier } from "@/lib/content/schemas";
import { filterPracticeRounds, selectPracticeRoundIds, utcDateKey, challengeNumber } from "@/lib/game/daily";
import { selectDailyRoundIdsFromManifest } from "@/lib/game/dailyManifest";
import { buildShareText } from "@/lib/game/share";
import { challengePayloadFromRun, decodeChallenge, encodeChallenge, type ChallengePayload } from "@/lib/game/challenge";
import { TIER_CONFIGS, nextInvestigationPenalty } from "@/lib/game/scoring";
import {
  activeRound,
  createRun,
  isAcceptedAtlasGuess,
  normalizeGuess,
  reduceRun,
  type RunMode,
  type RunState
} from "@/lib/game/state";
import {
  defaultPersistedState,
  loadPersistedState,
  persistRun,
  recordRunCompletion,
  savePersistedState,
  type PersistedState
} from "@/lib/persistence/storage";
import { countryNameByIso3, formatValue } from "@/lib/geo/format";
import { MapLegend } from "@/components/MapLegend";
import { WorldMap } from "@/components/WorldMap";

const DIFFICULTY_LABELS: Record<IndicatorDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
};

type LoadedData = {
  manifest: Manifest;
  dailyManifest: DailyManifest | null;
  dailyManifestIssue: string | null;
  map: MapFeatureCollection;
  rounds: RoundDefinition[];
  roundById: Map<string, RoundDefinition>;
  indicators: Map<string, IndicatorSummary>;
  entities: Entity[];
  countryNames: Map<string, string>;
};

type WorldprintClientProps = {
  dateOverride?: string;
  entryMode?: "standard" | "challenge";
};

function useGameDateKey(dateOverride?: string) {
  const searchParams = useSearchParams();
  const override = searchParams.get("date");
  return dateOverride ?? (override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : utcDateKey(new Date()));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function summarizeMix(values: string[]) {
  if (values.length === 0) return "none";
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => (count > 1 ? `${value} x${count}` : value))
    .join(", ");
}

function practiceSetCode(ids: string[]) {
  let hash = 2166136261;
  for (const id of ids.join("|")) {
    hash ^= id.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(5, "0").slice(-5);
}

export function WorldprintClient({ dateOverride, entryMode = "standard" }: WorldprintClientProps) {
  const searchParams = useSearchParams();
  const actualTodayKey = utcDateKey(new Date());
  const todayKey = useGameDateKey(dateOverride);
  const isArchiveDate = Boolean(dateOverride && todayKey !== actualTodayKey);
  const challengeCode = entryMode === "challenge" ? searchParams.get("c") : null;
  const [data, setData] = useState<LoadedData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [store, setStore] = useState<PersistedState>(() => defaultPersistedState());
  const [selectedTier, setSelectedTier] = useState<Tier>("analyst");
  const [run, setRun] = useState<RunState | null>(null);
  const [indicatorCache, setIndicatorCache] = useState<Record<string, IndicatorArtifact>>({});
  const [selectedCountryIso3, setSelectedCountryIso3] = useState("");
  const [masterGuess, setMasterGuess] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [practiceCategory, setPracticeCategory] = useState("");
  const [practiceDifficulty, setPracticeDifficulty] = useState<IndicatorDifficulty>("intro");
  const [practiceSalt, setPracticeSalt] = useState("starter");
  const [practiceSetRoundIds, setPracticeSetRoundIds] = useState<string[]>([]);
  const [practiceSetStatus, setPracticeSetStatus] = useState<"idle" | "ready">("idle");

  useEffect(() => {
    const persisted = loadPersistedState();
    setStore(persisted);
    setSelectedTier(persisted.selectedTier);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      const [manifest, roundsArtifact] = await Promise.all([loadManifest(), loadRounds()]);
      const [map, registry, manifestResult] = await Promise.allSettled([
        loadMap(manifest.map.path),
        loadEntityRegistry(manifest.entityRegistry.path),
        loadDailyManifest(todayKey)
      ]);
      if (cancelled) return;
      if (map.status === "rejected") throw map.reason;
      if (registry.status === "rejected") throw registry.reason;
      const dailyManifest = manifestResult.status === "fulfilled" ? manifestResult.value : null;
      const dailyManifestIssue = manifestResult.status === "rejected" ? "Daily manifest could not be validated; using deterministic fallback." : null;
      setData({
        manifest,
        dailyManifest,
        dailyManifestIssue,
        map: map.value,
        rounds: roundsArtifact.rounds,
        roundById: new Map(roundsArtifact.rounds.map((round) => [round.id, round])),
        indicators: new Map(manifest.indicators.map((indicator) => [indicator.id, indicator])),
        entities: registry.value.entities,
        countryNames: countryNameByIso3(registry.value.entities)
      });
    }
    loadAll().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Could not load Mystery Map data"));
    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  const ensureIndicators = useCallback(
    async (indicatorIds: string[]) => {
      if (!data) return;
      const missing = indicatorIds.filter((id) => !indicatorCache[id]);
      if (missing.length === 0) return;
      const loaded = await Promise.all(
        missing.map(async (id) => {
          const summary = data.indicators.get(id);
          if (!summary) throw new Error(`Missing indicator ${id}`);
          return [id, await loadIndicator(summary.path)] as const;
        })
      );
      setIndicatorCache((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    },
    [data, indicatorCache]
  );

  useEffect(() => {
    if (!run) return;
    const ids = run.rounds.map((round) => round.correctIndicatorId);
    ensureIndicators(ids).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Could not load indicators"));
  }, [run, ensureIndicators]);

  useEffect(() => {
    if (!run) return;
    setStore((current) => {
      let next = persistRun(current, run);
      if (run.status === "complete") {
        next = recordRunCompletion(next, run);
      }
      savePersistedState(next);
      return next;
    });
  }, [run]);

  const currentPhase = run ? run.rounds[run.currentRoundIndex]?.phase : null;
  const runStatus = run?.status ?? null;

  useEffect(() => {
    if (!runStatus) return;
    if (runStatus === "complete" || currentPhase === "active" || currentPhase === "solved") {
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  }, [currentPhase, runStatus]);

  const currentDailyRun = useMemo(() => {
    if (!data) return null;
    const active = store.activeDailyRun;
    if (active && active.dateKey === todayKey && active.contentVersion === data.manifest.contentVersion) {
      return active;
    }
    return null;
  }, [data, store.activeDailyRun, todayKey]);

  const currentArchiveRun = useMemo(() => {
    if (!data) return null;
    const active = store.activeArchiveRunsByDate[todayKey];
    if (active && active.contentVersion === data.manifest.contentVersion) {
      return active;
    }
    return null;
  }, [data, store.activeArchiveRunsByDate, todayKey]);

  const challengeResult = useMemo(() => decodeChallenge(challengeCode), [challengeCode]);

  const practiceFilters = useMemo(
    () => ({
      category: practiceCategory || undefined,
      difficulty: practiceDifficulty
    }),
    [practiceCategory, practiceDifficulty]
  );

  const practiceMatches = useMemo(() => {
    if (!data) return [];
    return filterPracticeRounds(data.rounds, practiceFilters);
  }, [data, practiceFilters]);

  const practiceCategories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.rounds.map((round) => round.category))).sort();
  }, [data]);

  const selectedPracticeRounds = useMemo(() => {
    if (!data) return [];
    return practiceSetRoundIds
      .map((id) => data.roundById.get(id))
      .filter((round): round is RoundDefinition => Boolean(round));
  }, [data, practiceSetRoundIds]);

  useEffect(() => {
    if (!data) return;
    setPracticeSalt("starter");
    setPracticeSetRoundIds([]);
    setPracticeSetStatus("idle");
  }, [data, practiceFilters]);

  function updateTier(tier: Tier) {
    setSelectedTier(tier);
    const next = { ...store, selectedTier: tier };
    setStore(next);
    savePersistedState(next);
  }

  function buildPracticeSet() {
    if (!data) return;
    const nextSalt = `reroll:${Date.now()}:${practiceSalt}`;
    const selectedIds = selectPracticeRoundIds(
      data.rounds,
      data.manifest.contentVersion,
      nextSalt,
      practiceFilters,
      practiceSetRoundIds
    );
    setPracticeSalt(nextSalt);
    setPracticeSetRoundIds(selectedIds);
    setPracticeSetStatus("ready");
  }

  async function startRun(mode: RunMode, challengePayload?: ChallengePayload) {
    if (!data) return;
    if (mode === "daily" && currentDailyRun) {
      setRun(currentDailyRun);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentDailyRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    if (mode === "archive" && currentArchiveRun) {
      setRun(currentArchiveRun);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentArchiveRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    const selectedIds =
      mode === "daily"
        ? selectDailyRoundIdsFromManifest(data.rounds, data.manifest.contentVersion, todayKey, data.dailyManifest).roundIds
        : mode === "archive"
          ? selectDailyRoundIdsFromManifest(data.rounds, data.manifest.contentVersion, todayKey, data.dailyManifest).roundIds
          : mode === "challenge" && challengePayload
            ? challengePayload.roundIds
            : selectedPracticeRounds.map((round) => round.id);
    if (selectedIds.length === 0) return;
    const roundIds = selectedIds.map((id) => {
      const round = data.roundById.get(id);
      if (!round) throw new Error(`Missing round ${id}`);
      return { roundId: round.id, correctIndicatorId: round.correctIndicatorId };
    });
    const nextRun = createRun({
      mode,
      dateKey: challengePayload?.dateKey ?? todayKey,
      contentVersion: data.manifest.contentVersion,
      tier: challengePayload?.tier ?? selectedTier,
      roundIds,
      salt: mode === "practice" ? practiceSalt : mode === "challenge" ? challengePayload?.checksum : undefined
    });
    await ensureIndicators(nextRun.rounds.map((round) => round.correctIndicatorId));
    setRun(nextRun);
    setSelectedCountryIso3("");
    setMasterGuess("");
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function dispatch(action: Parameters<typeof reduceRun>[1]) {
    setRun((current) => (current ? reduceRun(current, action) : current));
  }

  if (loadError) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Mystery Map data did not load</h1>
          <p>{loadError}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Loading Mystery Map</h1>
          <p>Preparing today&apos;s source-backed map set.</p>
        </div>
      </section>
    );
  }

  if (entryMode === "challenge") {
    if (!challengeResult.ok) {
      return (
        <section className="game-shell page-shell">
          <div className="empty-state surface challenge-state">
            <p className="eyebrow">Challenge unavailable</p>
            <h1>This Can You Geo? challenge cannot be opened.</h1>
            <p>{challengeResult.message}</p>
          </div>
        </section>
      );
    }
    if (challengeResult.payload.contentVersion !== data.manifest.contentVersion) {
      return (
        <section className="game-shell page-shell">
          <div className="empty-state surface challenge-state">
            <p className="eyebrow">Challenge version mismatch</p>
            <h1>This challenge belongs to another content version.</h1>
            <p>
              It was built for {challengeResult.payload.contentVersion}; this static build contains {data.manifest.contentVersion}.
              The link will not be remixed against newer maps.
            </p>
          </div>
        </section>
      );
    }
    const missingChallengeRounds = challengeResult.payload.roundIds.filter((roundId) => !data.roundById.has(roundId));
    if (missingChallengeRounds.length > 0) {
      return (
        <section className="game-shell page-shell">
          <div className="empty-state surface challenge-state">
            <p className="eyebrow">Challenge unavailable</p>
            <h1>Some maps in this challenge are missing.</h1>
            <p>This static build cannot find {missingChallengeRounds.length} required round ID.</p>
          </div>
        </section>
      );
    }
    const missingChallengeIndicators = challengeResult.payload.roundIds
      .map((roundId) => data.roundById.get(roundId)?.correctIndicatorId)
      .filter((indicatorId): indicatorId is string => Boolean(indicatorId))
      .filter((indicatorId) => !data.indicators.has(indicatorId));
    if (missingChallengeIndicators.length > 0) {
      return (
        <section className="game-shell page-shell">
          <div className="empty-state surface challenge-state">
            <p className="eyebrow">Challenge unavailable</p>
            <h1>Some indicator data is missing.</h1>
            <p>This static build cannot find {missingChallengeIndicators.length} required indicator artifact.</p>
          </div>
        </section>
      );
    }
    if (!run) {
      return (
        <section className="game-entry page-shell">
          <div className="entry-copy">
            <p className="eyebrow">Can You Geo? Challenge</p>
            <h1 className="page-title">Play the exact same maps.</h1>
            <p className="lead">
              This Mystery Map link locks the content version, skill tier, and round IDs. Challenge plays do not affect today&apos;s Daily streak.
            </p>
            <div className="entry-facts" aria-label="Challenge facts">
              <span>{challengeResult.payload.roundIds.length} maps</span>
              <span>{TIER_CONFIGS[challengeResult.payload.tier].label}</span>
              <span>{challengeResult.payload.kind === "daily" ? "Daily map set" : "Practice map set"}</span>
            </div>
          </div>
          <div className="entry-panel surface challenge-intro">
            <p className="setup-kicker">Challenge link</p>
            <h2>Ready when you are</h2>
            <p>
              The answers are not visible in the URL text. Complete the set, then share a spoiler-free score back.
            </p>
            <button className="button full-width" type="button" onClick={() => void startRun("challenge", challengeResult.payload)}>
              <Compass size={18} aria-hidden="true" />
              Start challenge
            </button>
          </div>
        </section>
      );
    }
  }

  if (isArchiveDate && !data.dailyManifest) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <p className="eyebrow">Archive unavailable</p>
          <h1>No generated Daily exists for {todayKey}.</h1>
          <p>Mystery Map archives are static. Choose a date from the generated archive index.</p>
        </div>
      </section>
    );
  }

  if (!run) {
    const activeDateRun = isArchiveDate ? currentArchiveRun : currentDailyRun;
    const dailyLabel = activeDateRun
      ? activeDateRun.status === "complete"
        ? isArchiveDate
          ? "Review archive result"
          : "View completed Mystery Map"
        : isArchiveDate
          ? "Continue archived Mystery Map"
          : "Continue today's Mystery Map"
      : isArchiveDate
        ? `Start ${todayKey} Mystery Map`
        : "Start today's Mystery Map";
    const selectedCount = selectedPracticeRounds.length;
    const categoryMix = summarizeMix(selectedPracticeRounds.map((round) => round.category));
    const difficultyMix = summarizeMix(selectedPracticeRounds.map((round) => DIFFICULTY_LABELS[round.difficulty]));
    const setCode = practiceSetCode(practiceSetRoundIds);
    const selectedDifficultyLabel = DIFFICULTY_LABELS[practiceDifficulty];
    const setReadyLabel = selectedCount > 0 ? "Practice set ready" : practiceMatches.length > 0 ? `${selectedDifficultyLabel} practice pool` : "No maps match these filters";
    const dailyReadyCount = data.rounds.filter((round) => round.eligibility.daily).length;
    return (
      <section className="game-entry page-shell">
        <div className="entry-copy">
          <EntryAtlasVisual />
          <p className="eyebrow">{isArchiveDate ? `Mystery Map Archive — ${todayKey}` : `Mystery Map Daily #${challengeNumber(todayKey)}`}</p>
          <h1 className="page-title">What does this map measure?</h1>
          <p className="lead">
            {isArchiveDate
              ? "This archive Daily is open in the public build: five unlabeled maps, one hidden indicator each."
              : "Today's open beta runs the full 5-map Daily: five unlabeled maps, one hidden indicator each."}{" "}
            Investigate countries when you need evidence, but every clue spends score.
          </p>
          <div className="entry-facts" aria-label="Daily facts">
            <span>{isArchiveDate ? "Open beta archive access" : "Open beta: no account required"}</span>
            <span>{isArchiveDate ? "Archive plays do not change today's streak" : "5-map Daily open now"}</span>
            <span>{data.rounds.length} playable maps</span>
            <span>{dailyReadyCount} Daily-ready maps</span>
          </div>
          <div className="entry-access-note" aria-label="Access model">
            <span>Access model</span>
            <p>
              {isArchiveDate
                ? "Archive access is open in this public build while account limits are not enforced."
                : "Today's public build is open while account limits are not enforced."}{" "}
              Future plan: try 3 maps instantly, free-account limited Daily Mystery Map play, and paid full atlas access.
            </p>
          </div>
          {data.dailyManifestIssue ? <p className="archive-note">{data.dailyManifestIssue}</p> : null}
        </div>
        <div className="entry-panel surface">
          <div className="setup-section">
            <div className="setup-heading">
              <p className="setup-kicker">Choose how you play</p>
              <p>Pick how much help you want. This changes answer choices, clue costs, investigations, and Atlas Master search.</p>
            </div>
            <TierSelector value={selectedTier} onChange={updateTier} />
          </div>
          {!isArchiveDate ? (
            <div className="button-row entry-primary-actions">
              <button className="button" type="button" onClick={() => void startRun("daily")}>
                <Compass size={18} aria-hidden="true" />
                {dailyLabel}
              </button>
            </div>
          ) : null}
          {!isArchiveDate ? (
          <div className="practice-panel" aria-label="Practice filters">
            <div>
              <p className="setup-kicker">Optional practice</p>
              <h2>Warm up with 3 {selectedDifficultyLabel} maps.</h2>
              <p>
                Today&apos;s Mystery Map starts its own 5-map set. Practice is the open 3-map warm-up in this build; filters only shape Practice and never change your Daily
                streak.
              </p>
            </div>
            <div className="practice-filters">
              <label htmlFor="practice-category">
                Topic
                <select id="practice-category" value={practiceCategory} onChange={(event) => setPracticeCategory(event.target.value)}>
                  <option value="">Any topic</option>
                  {practiceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="practice-difficulty">
                Map difficulty
                <select
                  id="practice-difficulty"
                  value={practiceDifficulty}
                  onChange={(event) => setPracticeDifficulty(event.target.value as IndicatorDifficulty)}
                >
                  <option value="intro">Intro</option>
                  <option value="standard">Standard</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
            </div>
            <p className="practice-helper">
              Intro is the default. Standard and Expert raise the map difficulty; Expert also unlocks expert-only practice maps.
            </p>
            <div className="practice-set-card" data-status={selectedCount > 0 ? practiceSetStatus : "empty"} aria-live="polite">
              <span>{setReadyLabel}</span>
              <strong>
                {selectedCount > 0
                  ? `${pluralize(selectedCount, "map")} selected from ${pluralize(practiceMatches.length, "matching map")}`
                  : practiceMatches.length > 0
                    ? `Build a random ${selectedDifficultyLabel} practice set.`
                    : "No maps match these filters."}
              </strong>
              {selectedCount > 0 ? (
                <>
                  <p>These {selectedCount} maps will be used when you start Practice. Normal scoring applies; Daily streaks are unaffected.</p>
                  <p>Category mix: {categoryMix}</p>
                  <p>Map difficulty mix: {difficultyMix}</p>
                  <small>Set code {setCode}</small>
                </>
              ) : (
                <p>{practiceMatches.length > 0 ? `${pluralize(practiceMatches.length, "map")} available for these filters.` : "Loosen the category or map difficulty filter."}</p>
              )}
              {practiceMatches.length > 0 && practiceMatches.length < 3 ? (
                <p className="practice-warning">Only {pluralize(practiceMatches.length, "matching map")} available; Practice will use every match.</p>
              ) : null}
            </div>
            <div className="practice-actions">
              <button className="button-secondary" type="button" disabled={practiceMatches.length === 0} onClick={buildPracticeSet}>
                <Shuffle size={17} aria-hidden="true" />
                {practiceSetStatus === "ready" ? "Reroll practice set" : "Build practice set"}
              </button>
              <button className="button-secondary practice-start-button" type="button" disabled={selectedPracticeRounds.length === 0} onClick={() => void startRun("practice")}>
                {selectedPracticeRounds.length > 0 ? `Start this ${selectedPracticeRounds.length}-map practice set` : "Start this 3-map practice set"}
              </button>
            </div>
          </div>
          ) : (
            <div className="archive-banner">
          <p className="setup-kicker">Mystery Map Archive</p>
              <h2>{todayKey}</h2>
              <p>This generated Mystery Map Daily uses frozen round IDs from the archive manifest. Archive plays save local history but do not change today&apos;s streak.</p>
            </div>
          )}
          {isArchiveDate ? (
          <div className="button-row">
            <button className="button" type="button" onClick={() => void startRun(isArchiveDate ? "archive" : "daily")}>
              <Compass size={18} aria-hidden="true" />
              {dailyLabel}
            </button>
          </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (run.status === "complete") {
    return <CompletionSummary run={run} store={store} onBack={() => setRun(null)} shareStatus={shareStatus} setShareStatus={setShareStatus} />;
  }

  const roundState = activeRound(run);
  const round = data.roundById.get(roundState.roundId);
  const indicator = indicatorCache[roundState.correctIndicatorId];
  if (!round || !indicator) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Loading round</h1>
          <p>Fetching the selected indicator artifact.</p>
        </div>
      </section>
    );
  }

  const config = TIER_CONFIGS[run.tier];
  const paidInvestigationCount = roundState.investigations.filter((item) => item.cost > 0).length;
  const investigationPenalty = nextInvestigationPenalty(run.tier, paidInvestigationCount);
  const currentChoices = run.tier === "atlasMaster" ? [] : round.choices[run.tier];
  const countryOptions = data.entities.filter((entity) => entity.iso3).sort((a, b) => a.name.localeCompare(b.name));
  const selectedCountry = countryOptions.find((entity) => entity.iso3 === selectedCountryIso3);
  const latestInvestigation = roundState.investigations.at(-1) ?? null;
  const selectedCountryValue = selectedCountry?.iso3 ? indicator.valuesByIso3[selectedCountry.iso3] ?? null : null;
  const selectedCountryInvestigation = selectedCountry?.iso3
    ? roundState.investigations.find((item) => item.iso3 === selectedCountry.iso3)
    : null;
  const selectedCountryHasData = selectedCountry ? selectedCountryValue !== null : false;
  const selectedCountryAlreadyRevealed = Boolean(selectedCountryInvestigation);
  const revealDisabled =
    !selectedCountry || (selectedCountryHasData && !selectedCountryAlreadyRevealed && investigationPenalty === null);
  const revealButtonText = !selectedCountry
    ? "Reveal value"
    : selectedCountryAlreadyRevealed
      ? `Show ${selectedCountry.name}'s value`
      : selectedCountryHasData
        ? `Reveal ${selectedCountry.name}'s value`
        : `Confirm ${selectedCountry.name} has no data`;

  const selectCountry = (iso3: string) => {
    setSelectedCountryIso3(iso3);
  };

  const investigate = (iso3: string, name: string) => {
    selectCountry(iso3);
    const value = indicator.valuesByIso3[iso3] ?? null;
    dispatch({ type: "investigate", iso3, countryName: name, value });
  };

  const topBottom = topAndBottom(indicator, data.countryNames);

  if (roundState.phase === "solved") {
    return (
      <RevealView
        run={run}
        round={round}
        roundState={roundState}
        indicator={indicator}
        map={data.map}
        topBottom={topBottom}
        countryNames={data.countryNames}
        indicators={data.indicators}
        onNext={() => dispatch({ type: "nextRound" })}
      />
    );
  }

  return (
    <section className="play-layout page-shell">
      <div className="play-map-panel">
        <div className="round-kicker">
          <span>
            Round {run.currentRoundIndex + 1} of {run.rounds.length}
          </span>
          <span>{config.label}</span>
          <span>
            {run.mode === "daily"
                  ? `Mystery Map Daily #${challengeNumber(run.dateKey)}`
                : run.mode === "archive"
                  ? `Mystery Map Archive ${run.dateKey}`
                  : run.mode === "challenge"
                  ? "Mystery Map Challenge"
                  : "Mystery Map Practice"}
          </span>
        </div>
        <h1 id="active-map-title">What does this map measure?</h1>
        <WorldMap
          map={data.map}
          indicator={indicator}
          investigatedIso3={roundState.investigations.map((item) => item.iso3)}
          selectedIso3={selectedCountryIso3}
          showHoverNames={run.tier === "explorer"}
          onCountryClick={(country) => selectCountry(country.iso3)}
          labelledBy="active-map-title"
        />
      </div>
      <div className="play-control-panel surface" aria-label="Round controls">
        <div className="score-block">
          <span>Possible score</span>
          <strong>{roundState.score}</strong>
        </div>
        <p className="map-rule">Darker means a larger numerical value. Hatched countries have no data for this round.</p>
        <div className="investigation-box">
          <h2>Investigate a country</h2>
          <p className="cost-note">Use this when a country is too small or hard to click on the map. Selecting only previews the country; revealing spends an investigation when the country has data.</p>
          <label htmlFor="country-search">Choose a country to investigate</label>
          <div className="country-select-row">
            <select id="country-search" value={selectedCountryIso3} onChange={(event) => setSelectedCountryIso3(event.target.value)}>
              <option value="">Choose a country</option>
              {countryOptions.map((entity) => (
                <option key={entity.mapId} value={entity.iso3 ?? ""}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>
          <div className="selected-country-card" data-state={selectedCountry ? "selected" : "empty"} aria-live="polite">
            {selectedCountry ? (
              <>
                <span>Selected country</span>
                <span className="selected-country-status">Selected: {selectedCountry.name}</span>
                <strong>{selectedCountry.name}</strong>
                <p>
                  {selectedCountryAlreadyRevealed
                    ? `Already revealed: ${selectedCountryInvestigation?.value === null ? "No data for this round" : formatValue(selectedCountryInvestigation?.value ?? selectedCountryValue ?? 0, indicator)}`
                    : selectedCountryHasData
                      ? "Data is available for this map. Reveal to see the value."
                      : "No data for this round. Revealing this status costs nothing."}
                </p>
                <small>
                  {selectedCountryAlreadyRevealed
                    ? "Already revealed countries do not spend points again."
                    : selectedCountryHasData
                      ? investigationPenalty === null
                        ? "No point-cost investigations remaining in this tier."
                        : `Reveal cost: ${investigationPenalty} points.`
                      : "Reveal cost: 0 points."}
                </small>
              </>
            ) : (
              <>
                <span>No country selected</span>
                <strong>Pick from the list or tap the map</strong>
                <p>Selecting from this list highlights the country before you decide whether to reveal its value.</p>
              </>
            )}
          </div>
          <button
            className="button-secondary full-width investigate-button"
            type="button"
            aria-label={selectedCountry ? revealButtonText : "Reveal selected country value"}
            disabled={revealDisabled}
            onClick={() => selectedCountry?.iso3 && investigate(selectedCountry.iso3, selectedCountry.name)}
          >
            <Search size={18} aria-hidden="true" />
            {revealButtonText}
          </button>
          <p className="cost-note">
            {investigationPenalty === null
              ? "No point-cost investigations remaining for new countries with data."
              : `Next new valid country costs ${investigationPenalty} points.`}
          </p>
          <div className="inspection-readout" aria-live="polite">
            {latestInvestigation ? (
              <>
                <span>{latestInvestigation.cost ? `-${latestInvestigation.cost} points` : "No cost"}</span>
                <strong>{latestInvestigation.countryName}</strong>
                <p>
                  {latestInvestigation.value === null ? "No data for this round" : formatValue(latestInvestigation.value, indicator)}
                </p>
              </>
            ) : (
              <>
                <span>Ready</span>
                <strong>Pick a country</strong>
                <p>Use the map or search control to reveal one country value.</p>
              </>
            )}
          </div>
        </div>
        {config.unitClue ? (
          <button className="button-secondary full-width" type="button" disabled={roundState.unitClueUsed} onClick={() => dispatch({ type: "unitClue" })}>
            <Lightbulb size={18} aria-hidden="true" />
            {roundState.unitClueUsed ? `Unit: ${indicator.unit}` : `Reveal unit clue (-${config.scoring.unitCluePenalty})`}
          </button>
        ) : null}
        {roundState.unitClueUsed ? <p className="unit-clue">Unit: {indicator.unit}</p> : null}
        <div className="answer-box">
          {run.tier === "atlasMaster" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const correct = isAcceptedAtlasGuess(masterGuess, round.acceptedAliases, indicator);
                dispatch({
                  type: "submit",
                  answerId: `guess:${normalizeGuess(masterGuess)}`,
                  label: masterGuess,
                  correct
                });
                if (!correct) setMasterGuess("");
              }}
            >
              <label htmlFor="master-search">Search playable map catalog</label>
              <input
                id="master-search"
                list="indicator-catalog"
                value={masterGuess}
                onChange={(event) => setMasterGuess(event.target.value)}
                placeholder="Type an indicator"
                autoComplete="off"
              />
              <datalist id="indicator-catalog">
                {Array.from(data.indicators.values())
                  .filter((item) => item.editorialReview.challengeEligible)
                  .map((item) => (
                    <option key={item.id} value={item.shortTitle} />
                  ))}
              </datalist>
              <button className="button full-width" type="submit" disabled={!masterGuess.trim()}>
                Submit answer
              </button>
            </form>
          ) : (
            <>
              <h2>Choose the indicator</h2>
              <div className="choice-list">
                {currentChoices.map((choice) => {
                  const rejected = roundState.rejectedAnswers.some((answer) => answer.id === choice.indicatorId);
                  return (
                    <button
                      key={choice.indicatorId}
                      type="button"
                      className="choice-button"
                      data-rejected={rejected ? "true" : "false"}
                      disabled={rejected}
                      onClick={() =>
                        dispatch({
                          type: "submit",
                          answerId: choice.indicatorId,
                          label: choice.label,
                          correct: choice.indicatorId === round.correctIndicatorId
                        })
                      }
                    >
                      <span>{choice.label}</span>
                      {rejected ? <small>Rejected</small> : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {roundState.rejectedAnswers.length > 0 ? (
            <div className="attempt-history">
              <strong>Rejected</strong>
              <span>{roundState.rejectedAnswers.map((answer) => answer.label).join(", ")}</span>
            </div>
          ) : null}
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {roundState.feedback}
        </div>
      </div>
    </section>
  );
}

function topAndBottom(indicator: IndicatorArtifact, countryNames: Map<string, string>) {
  const rows = Object.entries(indicator.valuesByIso3)
    .map(([iso3, value]) => ({ iso3, name: countryNames.get(iso3) ?? iso3, value }))
    .sort((a, b) => b.value - a.value);
  return {
    highest: rows.slice(0, 5),
    lowest: rows.slice(-5).reverse()
  };
}

type RankedCountry = ReturnType<typeof topAndBottom>["highest"][number];

function RevealView({
  run,
  round,
  roundState,
  indicator,
  map,
  topBottom,
  countryNames,
  indicators,
  onNext
}: {
  run: RunState;
  round: RoundDefinition;
  roundState: ReturnType<typeof activeRound>;
  indicator: IndicatorArtifact;
  map: MapFeatureCollection;
  topBottom: ReturnType<typeof topAndBottom>;
  countryNames: Map<string, string>;
  indicators: Map<string, IndicatorSummary>;
  onNext: () => void;
}) {
  const choiceProviderCodes = new Set(
    Object.values(round.choices)
      .flat()
      .map((choice) => indicators.get(choice.indicatorId)?.providerCode)
      .filter(Boolean)
  );
  const commonConfusions = [...indicator.editorial.commonConfusions].sort((left, right) => {
    const leftInChoices = choiceProviderCodes.has(left.confusedWithIndicatorCode);
    const rightInChoices = choiceProviderCodes.has(right.confusedWithIndicatorCode);
    return Number(rightInChoices) - Number(leftInChoices);
  });
  return (
    <section className="reveal-layout page-shell">
      <div className="reveal-map">
        <p className="eyebrow">Solved for {roundState.score} points</p>
        <h1 id="reveal-map-title">{indicator.shortTitle}</h1>
        <p className="full-indicator-title">{indicator.title}</p>
        <div className="source-badges" aria-label="Indicator metadata">
          <span>{indicator.unit}</span>
          <span>{indicator.year}</span>
          <span>{indicator.stats.coverage} countries</span>
        </div>
        <WorldMap
          map={map}
          indicator={indicator}
          investigatedIso3={roundState.investigations.map((item) => item.iso3)}
          interactive={false}
          labelledBy="reveal-map-title"
        />
      </div>
      <div className="reveal-panel surface" aria-label="Reveal details">
        <div className="reveal-scoreline">
          <span>Correct answer</span>
          <strong>{indicator.shortTitle}</strong>
          <small>{roundState.score} points</small>
        </div>
        <dl className="indicator-facts">
          <div>
            <dt>Unit</dt>
            <dd>{indicator.unit}</dd>
          </div>
          <div>
            <dt>Source and year</dt>
            <dd>
              {indicator.source.attribution}, {indicator.year}
            </dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{indicator.stats.coverage} countries</dd>
          </div>
          <div>
            <dt>Definition</dt>
            <dd>{indicator.definition}</dd>
          </div>
        </dl>
        <div className="lesson-stack">
          <section className="lesson-card lesson-card-strong" aria-labelledby="showing-heading">
            <p className="eyebrow" id="showing-heading">
              What the map was showing
            </p>
            <p>{indicator.editorial.patternNote}</p>
          </section>
          <section className="lesson-card" aria-labelledby="why-heading">
            <h2 id="why-heading">Why it matters</h2>
            <p>{indicator.editorial.whyItMatters}</p>
          </section>
          <section className="lesson-card" aria-labelledby="probe-heading">
            <h2 id="probe-heading">Best countries to investigate</h2>
            <ul className="probe-list">
              {indicator.editorial.bestProbeCountries.map((probe) => {
                const value = indicator.valuesByIso3[probe.iso3];
                return (
                  <li key={probe.iso3}>
                    <span>
                      <strong>{countryNames.get(probe.iso3) ?? probe.iso3}</strong>
                      {value === undefined ? "No data" : formatValue(value, indicator)}
                    </span>
                    <p>{probe.reason}</p>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="lesson-card" aria-labelledby="confusion-heading">
            <h2 id="confusion-heading">Why the wrong answers were tempting</h2>
            <ul className="confusion-list">
              {commonConfusions.slice(0, 3).map((confusion) => (
                <li key={confusion.confusedWithIndicatorCode}>
                  <strong>{indicatorTitleByProviderCode(indicators, confusion.confusedWithIndicatorCode)}</strong>
                  <span>{confusion.reason}</span>
                </li>
              ))}
            </ul>
          </section>
          {indicator.editorial.dataCaveat ? (
            <section className="lesson-card caveat-card" aria-labelledby="caveat-heading">
              <h2 id="caveat-heading">Data caveat</h2>
              <p>{indicator.editorial.dataCaveat}</p>
            </section>
          ) : null}
        </div>
        <div>
          <h2>Legend</h2>
          <MapLegend indicator={indicator} />
        </div>
        <RankedTable title="Highest five" rows={topBottom.highest} indicator={indicator} />
        <RankedTable title="Lowest five" rows={topBottom.lowest} indicator={indicator} />
        <div>
          <h2>Investigations</h2>
          {roundState.investigations.length ? (
            <ul className="investigation-history">
              {roundState.investigations.map((item) => (
                <li key={item.iso3}>
                  <span>{item.countryName}</span>
                  <strong>{item.value === null ? "No data" : formatValue(item.value, indicator)}</strong>
                  <small>{item.cost ? `-${item.cost}` : "no cost"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No countries investigated.</p>
          )}
        </div>
        <p className="source-note">
          Source: {indicator.source.attribution}, {indicator.source.dataset}.{" "}
          <a href={indicator.source.sourceReference}>Metadata</a>
        </p>
        <button className="button full-width" type="button" onClick={onNext}>
          {run.currentRoundIndex + 1 >= run.rounds.length ? "See results" : "Next round"}
        </button>
      </div>
    </section>
  );
}

function indicatorTitleByProviderCode(indicators: Map<string, IndicatorSummary>, providerCode: string): string {
  for (const indicator of indicators.values()) {
    if (indicator.providerCode === providerCode) return indicator.shortTitle;
  }
  return providerCode;
}

function RankedTable({ title, rows, indicator }: { title: string; rows: RankedCountry[]; indicator: IndicatorArtifact }) {
  return (
    <div>
      <h2>{title}</h2>
      <table className="rank-table">
        <thead>
          <tr>
            <th>Country</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.iso3}`}>
              <td>{row.name}</td>
              <td>{formatValue(row.value, indicator)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompletionSummary({
  run,
  store,
  onBack,
  shareStatus,
  setShareStatus
}: {
  run: RunState;
  store: PersistedState;
  onBack: () => void;
  shareStatus: string;
  setShareStatus: (value: string) => void;
}) {
  const shareText = buildShareText(run);
  const challengeCode = encodeChallenge(challengePayloadFromRun(run));
  const challengeUrl =
    typeof window === "undefined" ? `/challenge/worldprint?c=${challengeCode}` : `${window.location.origin}/challenge/worldprint/?c=${challengeCode}`;
  const challengeShareText = buildShareText({ ...run, mode: "challenge" }, { challengeUrl });
  const total = run.rounds.reduce((sum, round) => sum + round.score, 0);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        setShareStatus("Shared.");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShareStatus("Copied spoiler-free result.");
    } catch {
      setShareStatus("Share text is ready below.");
    }
  }

  async function copyChallenge() {
    try {
      await navigator.clipboard.writeText(challengeShareText);
      setShareStatus("Copied challenge link.");
    } catch {
      setShareStatus("Challenge text is ready below.");
    }
  }

  const summaryLabel =
    run.mode === "daily"
      ? `Mystery Map Daily #${challengeNumber(run.dateKey)}`
      : run.mode === "archive"
        ? `Mystery Map Archive — ${run.dateKey}`
        : run.mode === "challenge"
          ? "Mystery Map Challenge complete"
          : "Mystery Map Practice complete";
  const challengeButtonLabel =
    run.mode === "practice"
      ? "Challenge a friend with this practice set"
      : run.mode === "daily"
        ? "Challenge a friend with today's maps"
        : "Challenge a friend with these maps";

  return (
    <section className="summary-shell page-shell">
      <div className="summary-main">
        <p className="eyebrow">{summaryLabel}</p>
        <h1 className="page-title">{total} points</h1>
        <p className="lead">
          {run.rounds.length} maps completed on {TIER_CONFIGS[run.tier].label}.{" "}
          {run.mode === "daily" ? `Daily streak: ${store.streak.current}.` : "Daily streaks are unaffected."}
        </p>
        <div className="result-cells" aria-label="Per-round scores">
          {run.rounds.map((round, index) => (
            <span key={round.roundId}>
              <small>{index + 1}</small>
              <strong>{round.score}</strong>
            </span>
          ))}
        </div>
        <div className="button-row">
          <button className="button" type="button" onClick={() => void share()}>
            <Share2 size={18} aria-hidden="true" />
            Share result
          </button>
          <button className="button-secondary" type="button" onClick={() => void copyChallenge()}>
            <Copy size={18} aria-hidden="true" />
            {challengeButtonLabel}
          </button>
          <button className="button-secondary" type="button" onClick={onBack}>
            Back to Mystery Map
          </button>
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {shareStatus}
        </div>
        <textarea className="share-text" readOnly value={shareText} aria-label="Spoiler-free share text" />
        <textarea className="share-text challenge-share-text" readOnly value={challengeShareText} aria-label="Spoiler-free challenge share text" />
      </div>
      <div className="stats-panel surface" aria-label="Lifetime statistics">
        <h2>Lifetime on this device</h2>
        <dl className="summary-stats">
          <div>
            <dt>Daily games</dt>
            <dd>{store.lifetime.dailyGames}</dd>
          </div>
          <div>
            <dt>Best streak</dt>
            <dd>{store.streak.best}</dd>
          </div>
          <div>
            <dt>Average Daily score</dt>
            <dd>{Math.round(store.lifetime.averageScore)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
