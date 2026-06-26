"use client";

import { Compass, Copy, Lightbulb, Search, Share2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EntryAtlasVisual } from "@/features/worldprint/EntryAtlasVisual";
import { TierSelector } from "@/features/worldprint/TierSelector";
import { PlayerStatsPanel } from "@/features/worldprint/PlayerStatsPanel";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
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
import { COUNTRY_REVEAL_COST, TIER_CONFIGS, nextInvestigationPenalty } from "@/lib/game/scoring";
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
  type CompletionHistory,
  type PersistedState
} from "@/lib/persistence/storage";
import { countryNameByIso3, formatValue } from "@/lib/geo/format";
import { unitClueForIndicator } from "@/lib/geo/unitClue";
import { clientRunKeyForRun, syncCompletedRunForAccount } from "@/lib/account/sync";
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

function practiceReadyLine(count: number) {
  if (count >= 3) return "3 maps ready";
  if (count === 2) return "2 maps ready for this topic";
  if (count === 1) return "1 map ready for this topic";
  return "No practice maps found for this combo";
}

function rarePracticeNote(count: number) {
  if (count === 2) return "Rare combo. Your warm-up will use both.";
  if (count === 1) return "Rare combo. Try this one or change the topic or difficulty.";
  return null;
}

function practiceLabel(difficulty: string, category: string) {
  return category ? `${difficulty} ${category} practice` : `${difficulty} practice`;
}

function practiceFlavor(difficulty: IndicatorDifficulty) {
  if (difficulty === "expert") return "A quick warm-up with trickier patterns.";
  if (difficulty === "standard") return "A quick warm-up with sharper patterns.";
  return "A quick warm-up before the Daily.";
}

function runProgressStats(run: RunState) {
  const solvedRounds = run.rounds.filter((round) => round.phase === "solved");
  const score = solvedRounds.reduce((total, round) => total + round.score, 0);
  const bestRound = solvedRounds.length ? Math.max(...solvedRounds.map((round) => round.score)) : null;
  return {
    score,
    mapsPlayed: solvedRounds.length,
    correctAnswers: solvedRounds.length,
    averageScore: solvedRounds.length ? Math.round(score / solvedRounds.length) : null,
    bestRound
  };
}

function formatStat(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-US");
}

function scoreRank(total: number, roundCount: number) {
  const possible = Math.max(1, roundCount * 1000);
  const ratio = total / possible;
  if (ratio >= 0.92) return { title: "Worldprint Master", note: "Elite pattern reading across the whole run." };
  if (ratio >= 0.76) return { title: "Pattern Hunter", note: "Strong reads, sharp clue discipline." };
  if (ratio >= 0.52) return { title: "Atlas Reader", note: "Good signal work with room to tighten the clues." };
  return { title: "Signal Seeker", note: "The map gave up its secrets. Now chase the cleaner read." };
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    const duration = 850;
    let frame = 0;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{displayValue.toLocaleString("en-US")}</>;
}

function formatRecordDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function savedArchiveRecord(store: PersistedState, dateKey: string): CompletionHistory | null {
  return store.archiveHistoryByDate[dateKey] ?? store.dailyHistoryByDate[dateKey] ?? null;
}

export function WorldprintClient({ dateOverride, entryMode = "standard" }: WorldprintClientProps) {
  const searchParams = useSearchParams();
  const actualTodayKey = utcDateKey(new Date());
  const todayKey = useGameDateKey(dateOverride);
  const isArchiveDate = Boolean(dateOverride && todayKey !== actualTodayKey);
  const challengeCode = entryMode === "challenge" ? searchParams.get("c") : null;
  const { entitlement, loading: entitlementLoading, signedIn } = useEntitlement();
  const account = useSupabaseAccount();
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
  const [cloudSaveStatus, setCloudSaveStatus] = useState("");
  const cloudSaveAttempts = useRef(new Set<string>());

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

  useEffect(() => {
    if (!run || run.status !== "complete") return;
    const clientRunKey = clientRunKeyForRun(run);
    if (!clientRunKey) return;
    if (!account.client || !account.user) {
      setCloudSaveStatus("Saved locally in this browser. Sign in to save this run to your account.");
      return;
    }
    if (cloudSaveAttempts.current.has(clientRunKey)) return;
    cloudSaveAttempts.current.add(clientRunKey);
    setCloudSaveStatus("Saving this run to your account...");
    void syncCompletedRunForAccount({ client: account.client, userId: account.user.id, run }).then((result) => {
      if (result.status === "saved") {
        setCloudSaveStatus("Saved to your account.");
      } else if (result.status === "error") {
        console.warn("[Can You Geo] Completed-run cloud sync failed.", result.error);
        setCloudSaveStatus("Saved locally. Account sync failed; open Saved Stats to try again.");
      }
    });
  }, [account.client, account.user, run]);

  const currentPhase = run ? run.rounds[run.currentRoundIndex]?.phase : null;
  const runStatus = run?.status ?? null;

  useEffect(() => {
    if (!runStatus) return;
    if (runStatus === "complete" || currentPhase === "active" || currentPhase === "solved") {
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  }, [currentPhase, runStatus]);

  useEffect(() => {
    setSelectedCountryIso3("");
  }, [run?.id, run?.currentRoundIndex]);

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

  async function startRun(mode: RunMode, challengePayload?: ChallengePayload, options: { freshReplay?: boolean } = {}) {
    if (!data) return;
    if (mode === "daily" && currentDailyRun && !options.freshReplay) {
      setRun(currentDailyRun);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentDailyRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    if (mode === "archive" && currentArchiveRun && !options.freshReplay) {
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
            <p className="eyebrow">Challenge unavailable</p>
            <h1>This challenge belongs to another build.</h1>
            <p>This static build cannot safely replay those exact maps. Ask the sender for a fresh link.</p>
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
            <p>This build cannot find {missingChallengeRounds.length} map required by the link. Ask the sender for a fresh link.</p>
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
            <h1>Some map data is missing.</h1>
            <p>This build cannot find {missingChallengeIndicators.length} map required by the link. Ask the sender for a fresh link.</p>
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
              This Mystery Map link locks the exact maps and skill tier. Challenge plays do not affect today&apos;s Daily streak.
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
          <p className="eyebrow">Past game unavailable</p>
          <h1>No Daily exists for {todayKey}.</h1>
          <p>Choose another day from Past Games.</p>
        </div>
      </section>
    );
  }

  if (!run) {
    const activeDateRun = isArchiveDate ? currentArchiveRun : currentDailyRun;
    const archiveRecord = isArchiveDate ? savedArchiveRecord(store, todayKey) : null;
    const archiveRecordDate = formatRecordDate(archiveRecord?.completedAt);
    const dailyLabel = activeDateRun
      ? activeDateRun.status === "complete"
        ? isArchiveDate
          ? "View record"
          : "View completed Mystery Map"
        : isArchiveDate
          ? "Continue replay"
          : "Continue today's Mystery Map"
      : isArchiveDate
        ? archiveRecord
          ? "Replay for better score"
          : "Play past map"
        : "Start today's Mystery Map";
    const selectedCount = selectedPracticeRounds.length;
    const selectedDifficultyLabel = DIFFICULTY_LABELS[practiceDifficulty];
    const setReadyLabel = practiceMatches.length > 0 ? practiceLabel(selectedDifficultyLabel, practiceCategory) : "Practice mode";
    const availablePracticeCount = Math.min(3, practiceMatches.length);
    const practiceWarning = rarePracticeNote(practiceMatches.length);
    const accountFactLabel = entitlementLoading
      ? "Checking account"
      : signedIn
        ? entitlement.plan === "pro"
          ? "Pro account"
          : "Free account"
        : "No account needed";
    const accessModelCopy = entitlementLoading
      ? "Checking your account access for this device."
      : signedIn
        ? entitlement.plan === "pro"
          ? "Pro account is active here. Daily, Practice, and Past Games stay playable while account sync grows."
          : "Free account is active here. The Daily stays playable, and your saved stats can follow this account as sync grows."
        : isArchiveDate
          ? "Past games are open in this public build while account limits are not enforced. Future Pro access will open the full atlas."
          : "Today's public build is open while account limits are not enforced. Future plans will include instant demo play, free Daily play, and paid full atlas access.";
    return (
      <section className="game-entry page-shell">
        <div className="entry-copy">
          <EntryAtlasVisual />
          <p className="eyebrow">{isArchiveDate ? `Past Mystery Map Replay · ${todayKey}` : `Mystery Map Daily #${challengeNumber(todayKey)}`}</p>
          <h1 className="page-title">What does this map measure?</h1>
          <p className="lead">
            {isArchiveDate
              ? "Replay this past Mystery Map as a record run: five unlabeled maps, one hidden indicator each."
              : "Today's open beta runs the full 5-map Daily: five unlabeled maps, one hidden indicator each."}{" "}
            Investigate countries when you need evidence, but every clue spends score.
          </p>
          <div className="entry-facts" aria-label="Daily facts">
            <span>{accountFactLabel}</span>
            <span>{isArchiveDate ? "Streak stays safe" : "5-map Daily"}</span>
            <span>Practice mode included</span>
          </div>
          <div className="entry-access-note" aria-label="Access model">
            <span>Access model</span>
            <p>{accessModelCopy}</p>
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
            <div className="practice-panel" aria-label="Practice options">
              <div>
                <p className="setup-kicker">Optional practice</p>
                <h2>Practice mode</h2>
                <p>Pick a topic and difficulty, then play a quick warm-up. Practice never touches your Daily streak.</p>
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
                Intro is a gentle start. Standard and Expert bring tighter, stranger map patterns.
              </p>
              <div className="practice-access-note" aria-label="Practice access">
                <span>{entitlement.capabilities.canUseFullPractice ? "Full atlas practice" : "Limited practice"}</span>
                <p>
                  {entitlement.capabilities.canUseFullPractice
                    ? "Pro access is active. Practice can grow into the full map atlas."
                    : `This warm-up stays at ${entitlement.capabilities.practiceLimit ?? 3} maps. Pro will unlock every practice map when paid access opens.`}
                </p>
                {!entitlement.capabilities.canUseFullPractice ? (
                  <Link href="/upgrade">
                    Full atlas coming soon
                  </Link>
                ) : null}
              </div>
              <div className="practice-set-card" data-status={selectedCount > 0 ? practiceSetStatus : "empty"} aria-live="polite">
                <span>{setReadyLabel}</span>
                <strong>
                  {selectedCount > 0
                    ? practiceReadyLine(selectedCount)
                    : practiceMatches.length > 0
                      ? practiceReadyLine(availablePracticeCount)
                      : practiceReadyLine(0)}
                </strong>
                {selectedCount > 0 ? (
                  <>
                    <p>{practiceFlavor(practiceDifficulty)}</p>
                  </>
                ) : (
                  <p>
                    {practiceMatches.length > 0
                      ? "Pick a practice set when you are ready."
                      : "Try another topic or difficulty."}
                  </p>
                )}
                {practiceWarning ? <p className="practice-warning">{practiceWarning}</p> : null}
              </div>
              <div className="practice-actions">
                <button
                  className="button practice-start-button"
                  type="button"
                  disabled={selectedPracticeRounds.length === 0}
                  onClick={() => void startRun("practice")}
                >
                  Start practice
                </button>
                <button className="button-secondary" type="button" disabled={practiceMatches.length === 0} onClick={buildPracticeSet}>
                  <Shuffle size={17} aria-hidden="true" />
                  {practiceSetStatus === "ready" ? "New practice set" : "Pick practice maps"}
                </button>
              </div>
            </div>
          ) : (
            <div className="archive-banner">
              <p className="setup-kicker">Past Mystery Map Replay</p>
              <h2>{todayKey}</h2>
              <p>
                This fixed 5-map set is your record slot for the date. Beat your saved score, or fill the archive if you have not played it yet. Past replays
                never change today&apos;s streak.
              </p>
              <div className="archive-record-summary" data-state={archiveRecord ? "saved" : "empty"} aria-label="Past game record">
                <span>{archiveRecord ? "Saved record" : "No record yet"}</span>
                <strong>{archiveRecord ? `${archiveRecord.bestScore.toLocaleString("en-US")} points` : "Fill this slot"}</strong>
                <p>
                  {archiveRecord
                    ? `${TIER_CONFIGS[archiveRecord.tier].shortLabel}${archiveRecordDate ? ` · saved ${archiveRecordDate}` : ""}`
                    : "Play the fixed map set once to create a personal best."}
                </p>
              </div>
            </div>
          )}
          {isArchiveDate ? (
            <div className="button-row archive-start-row">
              <button className="button" type="button" onClick={() => void startRun(isArchiveDate ? "archive" : "daily")}>
                <Compass size={18} aria-hidden="true" />
                {dailyLabel}
              </button>
              {activeDateRun?.status === "complete" ? (
                <button className="button-secondary" type="button" onClick={() => void startRun("archive", undefined, { freshReplay: true })}>
                  Replay again
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (run.status === "complete") {
    return (
      <CompletionSummary
        run={run}
        store={store}
        onBack={() => setRun(null)}
        shareStatus={shareStatus}
        setShareStatus={setShareStatus}
        cloudSaveStatus={cloudSaveStatus}
        signedIn={signedIn}
      />
    );
  }

  const roundState = activeRound(run);
  const round = data.roundById.get(roundState.roundId);
  const indicator = indicatorCache[roundState.correctIndicatorId];
  if (!round || !indicator) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Loading round…</h1>
          <p>Preparing the selected map.</p>
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
  const unitClue = unitClueForIndicator(indicator);
  const runStats = runProgressStats(run);
  const latestRejectedAnswer = roundState.rejectedAnswers.at(-1) ?? null;
  const feedbackText = roundState.feedback ?? "";
  const showIncorrectFeedback = Boolean(latestRejectedAnswer && feedbackText.toLowerCase().includes("incorrect"));

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
                ? `Past Mystery Map Replay ${run.dateKey}`
                : run.mode === "challenge"
                  ? "Mystery Map Challenge"
                  : "Mystery Map Practice"}
          </span>
        </div>
        <h1 id="active-map-title">What does this map measure?</h1>
        <WorldMap
          map={data.map}
          indicator={indicator}
          countryNames={data.countryNames}
          investigatedIso3={roundState.investigations.map((item) => item.iso3)}
          selectedIso3={selectedCountryIso3}
          onCountryClick={(country) => selectCountry(country.iso3)}
          labelledBy="active-map-title"
        />
      </div>
      <div className="play-control-panel surface" aria-label="Round controls">
        <div className="score-block">
          <span>Current map points available</span>
          <strong key={roundState.score} data-score-tone={roundState.score < 0 ? "negative" : "positive"}>
            {roundState.score}
          </strong>
          <small>These points are added to the run total after the map is solved.</small>
        </div>
        <div className="run-stats-card" aria-label="Run total so far">
          <span>Run total so far</span>
          <dl>
            <div>
              <dt>Banked score</dt>
              <dd>{formatStat(runStats.score)}</dd>
            </div>
            <div>
              <dt>Maps played</dt>
              <dd>{runStats.mapsPlayed}</dd>
            </div>
            <div>
              <dt>Correct</dt>
              <dd>{runStats.correctAnswers}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>{formatStat(runStats.averageScore)}</dd>
            </div>
            <div>
              <dt>Best round</dt>
              <dd>{formatStat(runStats.bestRound)}</dd>
            </div>
          </dl>
        </div>
        <p className="map-rule">Darker means a larger numerical value. Hatched countries have no data for this round.</p>
        <div className="investigation-box">
          <h2>Investigate a country</h2>
          <p className="cost-note">
            Use this when a country is too small or hard to click. Selecting only previews the country. Revealing a value costs{" "}
            {COUNTRY_REVEAL_COST} points.
          </p>
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
          {selectedCountry ? (
            <div className="selected-country-card" data-state="selected" aria-live="polite">
              <span>Selected country</span>
              <strong>{selectedCountry.name}</strong>
              <p>
                {selectedCountryAlreadyRevealed
                  ? selectedCountryInvestigation?.value === null
                    ? "No data for this country on this map. Try another one."
                    : `Revealed: ${formatValue(selectedCountryInvestigation?.value ?? selectedCountryValue ?? 0, indicator)}`
                  : selectedCountryHasData
                    ? "Reveal this country's value when you need a clue."
                    : "No data for this country on this map. Try another one."}
              </p>
              <small>
                {selectedCountryAlreadyRevealed
                  ? "No points spent this time."
                  : selectedCountryHasData
                    ? investigationPenalty === null
                      ? "Country reveals used up for this round."
                      : `Reveal cost: ${investigationPenalty} points.`
                    : "Reveal cost: 0 points."}
              </small>
            </div>
          ) : null}
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
              ? "Country reveals used up for this round."
              : `Next reveal costs ${investigationPenalty} points.`}
          </p>
          <div className="inspection-readout" aria-live="polite">
            {latestInvestigation ? (
              <>
                <span>{latestInvestigation.cost ? `-${latestInvestigation.cost} points` : "No cost"}</span>
                <strong>{latestInvestigation.countryName}</strong>
                <p>
                  {latestInvestigation.value === null ? "No data for this country on this map." : formatValue(latestInvestigation.value, indicator)}
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
        {config.unitClue && unitClue.eligible ? (
          <button className="button-secondary full-width" type="button" disabled={roundState.unitClueUsed} onClick={() => dispatch({ type: "unitClue" })}>
            <Lightbulb size={18} aria-hidden="true" />
            {roundState.unitClueUsed ? `Unit clue: ${unitClue.text}` : `Reveal unit: -${config.scoring.unitCluePenalty}`}
          </button>
        ) : null}
        {config.unitClue && !unitClue.eligible ? <p className="unit-clue">{unitClue.text}</p> : null}
        {roundState.unitClueUsed && unitClue.eligible ? <p className="unit-clue">Unit clue: {unitClue.text}</p> : null}
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
        {showIncorrectFeedback ? (
          <div className="answer-feedback-banner" data-result="incorrect" role="status" aria-live="polite">
            <span>Incorrect</span>
            <strong>{latestRejectedAnswer?.label}</strong>
            <p>{feedbackText} Cross it off and read the remaining signal.</p>
          </div>
        ) : null}
        <div className="status-live" role="status" aria-live="polite">
          {showIncorrectFeedback ? "" : feedbackText}
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
  const resultLabel = roundState.score < 0 ? `Round lost: ${roundState.score} points` : `Solved for ${roundState.score} points`;
  const scoreText = `${roundState.score >= 0 ? "+" : ""}${roundState.score.toLocaleString("en-US")} points`;
  const missedAnswerCount = roundState.rejectedAnswers.length;
  const resultTone = missedAnswerCount > 0 ? "recovered" : "correct";
  const nextMapNumber = run.currentRoundIndex + 2;
  const finalRoundSolved = run.currentRoundIndex + 1 >= run.rounds.length;
  const hasInvestigationHistory = roundState.unitClueUsed || roundState.investigations.length > 0;
  return (
    <section className="reveal-layout page-shell">
      <div className="reveal-map" data-result={resultTone}>
        <p className="eyebrow">{resultLabel}</p>
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
          countryNames={countryNames}
          investigatedIso3={roundState.investigations.map((item) => item.iso3)}
          interactive={false}
          labelledBy="reveal-map-title"
        />
        <div className="solve-moment-overlay" data-result={resultTone} aria-hidden="true">
          <span>{resultTone === "correct" ? "Correct" : "Answer found"}</span>
          <strong>{resultTone === "correct" ? "Solved" : "Revealed"}</strong>
          <em>{scoreText}</em>
        </div>
        <div className="result-atlas-burst" data-result={resultTone} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="reveal-panel surface" aria-label="Reveal details">
        <div className="round-result-banner" data-result={resultTone} role="status" aria-live="polite">
          <span>{missedAnswerCount > 0 ? "Answer revealed" : "Correct"}</span>
          <strong>{missedAnswerCount > 0 ? indicator.shortTitle : "Solved."}</strong>
          <p>
            {missedAnswerCount > 0
              ? `Correct answer: ${indicator.shortTitle}. ${missedAnswerCount} wrong ${missedAnswerCount === 1 ? "read" : "reads"} ruled out.`
              : `Sharp read. The hidden map was ${indicator.shortTitle}.`}
          </p>
          <em>{scoreText}</em>
          <div className="banked-score-flight" aria-hidden="true">
            {scoreText} banked
          </div>
        </div>
        <div className="reveal-scoreline">
          <span>Answer</span>
          <strong>{indicator.shortTitle}</strong>
          <small>{resultLabel}</small>
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
          {hasInvestigationHistory ? (
            <ul className="investigation-history">
              {roundState.unitClueUsed ? (
                <li key="unit-clue">
                  <span>Unit clue</span>
                  <strong>{indicator.unit}</strong>
                  <small>-{TIER_CONFIGS[run.tier].scoring.unitCluePenalty} points</small>
                </li>
              ) : null}
              {roundState.investigations.map((item) => (
                <li key={item.iso3}>
                  <span>{item.countryName}</span>
                  <strong>{item.value === null ? "No data" : formatValue(item.value, indicator)}</strong>
                  <small>{item.cost ? `-${item.cost} points` : "no cost"}</small>
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
        <div className="round-transition-card" data-final={finalRoundSolved ? "true" : "false"}>
          <span>{finalRoundSolved ? "Run complete" : `Map ${nextMapNumber} of ${run.rounds.length}`}</span>
          <strong>{finalRoundSolved ? "Ready for the final score." : "Next map is ready."}</strong>
        </div>
        <button className="button full-width next-map-button" type="button" onClick={onNext}>
          {finalRoundSolved ? "See results" : "Next map"}
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
  setShareStatus,
  cloudSaveStatus,
  signedIn
}: {
  run: RunState;
  store: PersistedState;
  onBack: () => void;
  shareStatus: string;
  setShareStatus: (value: string) => void;
  cloudSaveStatus: string;
  signedIn: boolean;
}) {
  const shareText = buildShareText(run);
  const challengeCode = encodeChallenge(challengePayloadFromRun(run));
  const challengeUrl =
    typeof window === "undefined" ? `/challenge/worldprint?c=${challengeCode}` : `${window.location.origin}/challenge/worldprint/?c=${challengeCode}`;
  const challengeShareText = buildShareText({ ...run, mode: "challenge" }, { challengeUrl });
  const total = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const bestRound = run.rounds.length ? Math.max(...run.rounds.map((round) => round.score)) : 0;
  const averageRound = run.rounds.length ? Math.round(total / run.rounds.length) : 0;
  const cleanReads = run.rounds.filter((round) => round.rejectedAnswers.length === 0).length;
  const cleanReadRate = run.rounds.length ? Math.round((cleanReads / run.rounds.length) * 100) : 0;
  const rank = scoreRank(total, run.rounds.length);
  const isPastRecord = run.mode === "archive";
  const saveNote = signedIn
    ? "Account sync is active. This run is saved locally first, then matched to your account when the connection is available."
    : "Local on this device. Sign in to save completed runs, stats, and streaks to your account.";
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
        ? `Past Mystery Map Replay · ${run.dateKey}`
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
        <h1 className="page-title final-score-title" aria-label={`${total.toLocaleString("en-US")} points`}>
          <AnimatedNumber value={total} /> points
        </h1>
        <div className="run-rank-card surface" aria-label="Run rank">
          <span>Run rank</span>
          <strong>{rank.title}</strong>
          <p>{rank.note}</p>
        </div>
        <p className="lead">
          {isPastRecord ? "Record entry saved for this fixed Past Game. " : ""}
          {run.rounds.length} maps completed on {TIER_CONFIGS[run.tier].label}.{" "}
          {run.mode === "daily" ? `Daily streak: ${store.streak.current}.` : "Daily streaks are unaffected."}
        </p>
        <div className="summary-achievement surface" aria-label="Completed run summary">
          <div>
            <span>Final score</span>
            <strong>
              <AnimatedNumber value={total} />
            </strong>
          </div>
          <div>
            <span>Best round</span>
            <strong>{bestRound.toLocaleString("en-US")}</strong>
          </div>
          <div>
            <span>Average</span>
            <strong>{averageRound.toLocaleString("en-US")}</strong>
          </div>
          <div>
            <span>Clean reads</span>
            <strong>{cleanReadRate}%</strong>
          </div>
        </div>
        <div className="result-cells" aria-label="Per-round scores">
          {run.rounds.map((round, index) => (
            <span key={round.roundId} data-best={round.score === bestRound ? "true" : "false"}>
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
            {isPastRecord ? "Back to record" : "Back to Mystery Map"}
          </button>
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {shareStatus}
        </div>
        <textarea className="share-text" readOnly value={shareText} aria-label="Spoiler-free share text" />
        <textarea className="share-text challenge-share-text" readOnly value={challengeShareText} aria-label="Spoiler-free challenge share text" />
        <section className="account-save-card surface" aria-label="Save your progress">
          <div>
            <p className="eyebrow">Save progress</p>
            <h2>{signedIn ? (isPastRecord ? "Past Game record sync is on." : "Account save is on.") : "Save your score and streak."}</h2>
            <p>
              {signedIn
                ? isPastRecord
                  ? "This Past Game result is saved locally first. Completed-run summaries sync to your account when the connection is available."
                  : "Your result is saved locally first. Completed-run summaries sync to your account when the connection is available."
                : "Your result is saved in this browser. A free account can save completed runs, stats, and streaks to your account."}
            </p>
            {cloudSaveStatus ? (
              <p className="status-live" role="status">
                {cloudSaveStatus}
              </p>
            ) : null}
          </div>
          <div className="button-row">
            <Link className="button" href={signedIn ? "/account/stats" : "/sign-in"}>
              {signedIn ? "View saved stats" : "Create a free account"}
            </Link>
            <Link className="button-secondary" href="/account">
              View account
            </Link>
          </div>
        </section>
      </div>
      <PlayerStatsPanel store={store} note={saveNote} />
    </section>
  );
}
