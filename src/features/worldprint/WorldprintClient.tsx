"use client";

import { Compass, Copy, Lightbulb, Mail, Search, Share2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { EntryAtlasVisual } from "@/features/worldprint/EntryAtlasVisual";
import { TierSelector } from "@/features/worldprint/TierSelector";
import { PlayerStatsPanel } from "@/features/worldprint/PlayerStatsPanel";
import { requestChallengeEmailInvite } from "@/features/worldprint/challengeEmailInvite";
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
import { filterPracticeRounds, selectPracticeRoundIds, challengeNumber } from "@/lib/game/daily";
import { selectDailyRoundIdsFromManifest } from "@/lib/game/dailyManifest";
import {
  FREE_DAILY_ROUND_COUNT,
  PRO_ATLAS_ROUND_COUNT,
  atlasSeenRoundIds,
  freeDailyRoundIds,
  sampleRunRoundIds,
  selectAtlasRoundIds
} from "@/lib/game/accessModel";
import { localDateKey, nextDailyUnlockCopy } from "@/lib/game/retention";
import {
  buildChallengeShareTarget,
  buildEmailChallengeHref,
  buildMysteryMapChallengeUrl,
  buildResultShareSummary,
  buildShareText,
  challengeComparisonCopy,
  scoreRank
} from "@/lib/game/share";
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
import { trackCanYouGeoEvent } from "@/lib/site/analytics";
import { PLAY_LOBBY_REQUEST_EVENT } from "@/lib/site/playLobbyNavigation";
import {
  defaultPersistedState,
  loadPersistedState,
  persistRun,
  recordRunCompletion,
  savePersistedState,
  type CompletionHistory,
  type CompletionRoundDetail,
  type PersistedState
} from "@/lib/persistence/storage";
import { countryNameByIso3, formatValue } from "@/lib/geo/format";
import { unitClueForIndicator } from "@/lib/geo/unitClue";
import { clientRunKeyForRun, fetchRemoteRunSummaries, syncCompletedRunForAccount } from "@/lib/account/sync";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { GameRunRow } from "@/lib/supabase/database";
import { MapLegend } from "@/components/MapLegend";
import { WorldMap } from "@/components/WorldMap";

const DIFFICULTY_LABELS: Record<IndicatorDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
};
const DIFFICULTY_ORDER: IndicatorDifficulty[] = ["intro", "standard", "expert"];
const ENTRY_PREVIEW_INDICATOR_ID = "internet-users";
const CHALLENGE_EMAIL_NOTE_MAX_LENGTH = 180;

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
  return dateOverride ?? (override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : localDateKey(new Date()));
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
  return "A quick Practice warm-up.";
}

function roundCountForFilters(rounds: RoundDefinition[], category: string, difficulty?: IndicatorDifficulty) {
  return rounds.filter((round) => (!category || round.category === category) && (!difficulty || round.difficulty === difficulty)).length;
}

function nearestPracticeDifficulty(current: IndicatorDifficulty, available: IndicatorDifficulty[]) {
  if (available.includes(current)) return current;
  if (available.length === 0) return current;
  const currentIndex = DIFFICULTY_ORDER.indexOf(current);
  return available.reduce((best, difficulty) => {
    const bestDistance = Math.abs(DIFFICULTY_ORDER.indexOf(best) - currentIndex);
    const nextDistance = Math.abs(DIFFICULTY_ORDER.indexOf(difficulty) - currentIndex);
    return nextDistance < bestDistance ? difficulty : best;
  }, available[0]);
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

function AnimatedNumber({ value, onComplete }: { value: number; onComplete?: () => void }) {
  const [displayValue, setDisplayValue] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    function completeAnimation() {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete?.();
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      completeAnimation();
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
      else completeAnimation();
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [onComplete, value]);

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

function bestDailyScoreForStore(store: PersistedState): number | null {
  const scores = Object.values(store.dailyHistoryByDate).map((completion) => completion.bestScore);
  return scores.length ? Math.max(...scores) : null;
}

type ArchiveReviewRecord = {
  dateKey: string;
  tier: Tier | null;
  totalScore: number;
  bestScore: number;
  roundScores: number[];
  roundCount: number;
  correctCount: number;
  completedAt: string | null;
  savedState: "Saved to account" | "Saved on this browser";
  roundDetails?: CompletionRoundDetail[];
};

function isTier(value: string | null | undefined): value is Tier {
  return Boolean(value && value in TIER_CONFIGS);
}

function accountRunForDate(runs: GameRunRow[], dateKey: string): GameRunRow | null {
  return runs.find((run) => (run.mode === "daily" || run.mode === "archive") && run.daily_date === dateKey) ?? null;
}

function archiveReviewRecord(local: CompletionHistory | null, accountRun: GameRunRow | null, dateKey: string): ArchiveReviewRecord | null {
  if (!local && !accountRun) return null;
  const tier = isTier(accountRun?.tier) ? accountRun.tier : (local?.tier ?? null);
  return {
    dateKey,
    tier,
    totalScore: accountRun?.total_score ?? local?.totalScore ?? 0,
    bestScore: Math.max(accountRun?.total_score ?? Number.NEGATIVE_INFINITY, local?.bestScore ?? Number.NEGATIVE_INFINITY, 0),
    roundScores: local?.roundScores ?? [],
    roundCount: accountRun?.maps_played ?? local?.roundCount ?? 0,
    correctCount: accountRun?.correct_count ?? local?.roundDetails?.filter((detail) => detail.result !== "incomplete").length ?? local?.roundCount ?? 0,
    completedAt: accountRun?.completed_at ?? local?.completedAt ?? null,
    savedState: accountRun ? "Saved to account" : "Saved on this browser",
    roundDetails: local?.roundDetails
  };
}

function reviewResultLabel(detail: CompletionRoundDetail) {
  if (detail.result === "correct") return "Correct";
  if (detail.result === "recovered") return "Recovered";
  return "Incomplete";
}

export function WorldprintClient({ dateOverride, entryMode = "standard" }: WorldprintClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actualTodayKey = localDateKey(new Date());
  const todayKey = useGameDateKey(dateOverride);
  const isArchiveDate = Boolean(dateOverride && todayKey !== actualTodayKey);
  const reviewRequested = isArchiveDate && searchParams.get("review") === "1";
  const challengeCode = entryMode === "challenge" ? searchParams.get("c") : null;
  const { entitlement, signedIn } = useEntitlement();
  const isProAccount = signedIn && entitlement.plan === "pro";
  const isFreeAccount = signedIn && entitlement.plan !== "pro";
  const isGuest = !signedIn;
  const canUseFullPractice = signedIn && entitlement.capabilities.canUseFullPractice;
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
  const [showFirstRunIntro, setShowFirstRunIntro] = useState(false);
  const [practiceCategory, setPracticeCategory] = useState("");
  const [practiceDifficulty, setPracticeDifficulty] = useState<IndicatorDifficulty>("intro");
  const [practiceSalt, setPracticeSalt] = useState("starter");
  const [practiceSetRoundIds, setPracticeSetRoundIds] = useState<string[]>([]);
  const [cloudSaveStatus, setCloudSaveStatus] = useState("");
  const [accountRuns, setAccountRuns] = useState<GameRunRow[]>([]);
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
    if (!data || !reviewRequested) return;
    const reviewRecord = savedArchiveRecord(store, todayKey);
    const indicatorIds = reviewRecord?.roundDetails?.map((detail) => detail.correctIndicatorId) ?? [];
    if (indicatorIds.length === 0) return;
    ensureIndicators(indicatorIds).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Could not load review details"));
  }, [data, ensureIndicators, reviewRequested, store, todayKey]);

  useEffect(() => {
    if (!data) return;
    const previewIndicatorId = data.indicators.has(ENTRY_PREVIEW_INDICATOR_ID)
      ? ENTRY_PREVIEW_INDICATOR_ID
      : data.manifest.indicators[0]?.id;
    if (!previewIndicatorId) return;
    ensureIndicators([previewIndicatorId]).catch((error: unknown) =>
      setLoadError(error instanceof Error ? error.message : "Could not load preview map")
    );
  }, [data, ensureIndicators]);

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

  useEffect(() => {
    let cancelled = false;
    async function loadAccountRuns() {
      if (!account.client || !account.user || !isArchiveDate) {
        setAccountRuns([]);
        return;
      }
      const result = await fetchRemoteRunSummaries(account.client, account.user.id);
      if (cancelled) return;
      if (result.error) {
        console.warn("[Can You Geo] Past Game account summary load failed.", result.error);
        setAccountRuns([]);
        return;
      }
      setAccountRuns(result.data);
    }
    void loadAccountRuns();
    return () => {
      cancelled = true;
    };
  }, [account.client, account.user, isArchiveDate]);

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
    if (
      signedIn &&
      active &&
      active.dateKey === todayKey &&
      active.contentVersion === data.manifest.contentVersion &&
      active.rounds.length === FREE_DAILY_ROUND_COUNT
    ) {
      return active;
    }
    return null;
  }, [data, signedIn, store.activeDailyRun, todayKey]);

  const currentAtlasRun = useMemo(() => {
    if (!data || !isProAccount) return null;
    const active = store.activeAtlasRun;
    if (active && active.mode === "atlas" && active.contentVersion === data.manifest.contentVersion) {
      return active;
    }
    return null;
  }, [data, isProAccount, store.activeAtlasRun]);

  const currentPracticeRun = useMemo(() => {
    if (!data || !canUseFullPractice) return null;
    const active = store.activePracticeRun;
    if (!active || active.mode !== "practice" || active.status !== "active" || active.contentVersion !== data.manifest.contentVersion) {
      return null;
    }
    return active;
  }, [canUseFullPractice, data, store.activePracticeRun]);

  const currentArchiveRun = useMemo(() => {
    if (!data) return null;
    const active = store.activeArchiveRunsByDate[todayKey];
    if (active && active.contentVersion === data.manifest.contentVersion) {
      return active;
    }
    return null;
  }, [data, store.activeArchiveRunsByDate, todayKey]);

  const currentAccountArchiveRun = useMemo(() => accountRunForDate(accountRuns, todayKey), [accountRuns, todayKey]);

  const challengeResult = useMemo(() => decodeChallenge(challengeCode), [challengeCode]);

  const practiceFilters = useMemo(
    () => ({
      category: practiceCategory || undefined,
      difficulty: practiceDifficulty
    }),
    [practiceCategory, practiceDifficulty]
  );

  const fullPracticeMatches = useMemo(() => {
    if (!data) return [];
    return filterPracticeRounds(data.rounds, practiceFilters);
  }, [data, practiceFilters]);

  const practiceMatches = canUseFullPractice ? fullPracticeMatches : [];

  const practiceCategoryOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.rounds.map((round) => round.category)))
      .sort()
      .map((category) => ({
        category,
        count: roundCountForFilters(data.rounds, category)
      }))
      .filter((option) => option.count > 0);
  }, [data]);

  const practiceDifficultyOptions = useMemo(() => {
    if (!data) return [];
    return DIFFICULTY_ORDER.map((difficulty) => ({
      difficulty,
      count: roundCountForFilters(data.rounds, practiceCategory, difficulty)
    })).filter((option) => option.count > 0);
  }, [data, practiceCategory]);

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
  }, [data, practiceFilters]);

  useEffect(() => {
    if (!data || practiceDifficultyOptions.length === 0) return;
    const availableDifficulties = practiceDifficultyOptions.map((option) => option.difficulty);
    const nextDifficulty = nearestPracticeDifficulty(practiceDifficulty, availableDifficulties);
    if (nextDifficulty !== practiceDifficulty) {
      setPracticeDifficulty(nextDifficulty);
    }
  }, [data, practiceDifficulty, practiceDifficultyOptions]);

  function updateTier(tier: Tier) {
    setSelectedTier(tier);
    const next = { ...store, selectedTier: tier };
    setStore(next);
    savePersistedState(next);
  }

  function updatePracticeCategory(category: string) {
    setPracticeCategory(category);
    if (!data) return;
    const availableDifficulties = DIFFICULTY_ORDER.filter((difficulty) => roundCountForFilters(data.rounds, category, difficulty) > 0);
    const nextDifficulty = nearestPracticeDifficulty(practiceDifficulty, availableDifficulties);
    if (nextDifficulty !== practiceDifficulty) {
      setPracticeDifficulty(nextDifficulty);
    }
  }

  function buildPracticeSet() {
    if (!signedIn) return;
    if (!canUseFullPractice) return;
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
  }

  async function startPracticeRun() {
    if (!signedIn) return;
    if (!canUseFullPractice) return;
    if (!data || practiceMatches.length === 0) return;
    if (currentPracticeRun?.status === "active") {
      await startRun("practice");
      return;
    }
    const selectedIds =
      selectedPracticeRounds.length > 0
        ? selectedPracticeRounds.map((round) => round.id)
        : selectPracticeRoundIds(data.rounds, data.manifest.contentVersion, practiceSalt, practiceFilters, []);
    if (selectedPracticeRounds.length === 0) {
      setPracticeSetRoundIds(selectedIds);
    }
    await startRun("practice", undefined, { practiceRoundIds: selectedIds, practiceSalt });
  }

  async function startArchivePracticeReplay() {
    if (!data) return;
    const selectedIds = selectDailyRoundIdsFromManifest(data.rounds, data.manifest.contentVersion, todayKey, data.dailyManifest).roundIds;
    await startRun("practice", undefined, {
      practiceRoundIds: selectedIds,
      practiceSalt: `past-game-practice:${todayKey}:${Date.now()}`
    });
  }

  async function startRun(
    mode: RunMode,
    challengePayload?: ChallengePayload,
    options: { freshReplay?: boolean; practiceRoundIds?: string[]; practiceSalt?: string } = {}
  ) {
    if (!data) return;
    if (mode === "practice" && !signedIn) return;
    if (mode === "daily" && !signedIn) return;
    if (mode === "archive" && !signedIn) return;
    if (mode === "atlas" && !isProAccount) return;
    if (mode === "practice" && !canUseFullPractice) return;
    if (mode === "daily" && currentDailyRun && !options.freshReplay) {
      setRun(currentDailyRun);
      setShowFirstRunIntro(!store.onboardingComplete && currentDailyRun.status === "active" && currentDailyRun.currentRoundIndex === 0);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentDailyRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    if (mode === "atlas" && currentAtlasRun?.status === "active" && !options.freshReplay) {
      setRun(currentAtlasRun);
      setShowFirstRunIntro(!store.onboardingComplete && currentAtlasRun.currentRoundIndex === 0);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentAtlasRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    if (mode === "practice" && currentPracticeRun?.status === "active" && !options.freshReplay) {
      setRun(currentPracticeRun);
      setShowFirstRunIntro(false);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentPracticeRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    if (mode === "archive" && currentArchiveRun && !options.freshReplay) {
      setRun(currentArchiveRun);
      setShowFirstRunIntro(false);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      await ensureIndicators(currentArchiveRun.rounds.map((round) => round.correctIndicatorId));
      return;
    }
    const dailyManifestIds = selectDailyRoundIdsFromManifest(data.rounds, data.manifest.contentVersion, todayKey, data.dailyManifest).roundIds;
    const atlasSelection =
      mode === "atlas"
        ? selectAtlasRoundIds({
            rounds: data.rounds,
            contentVersion: data.manifest.contentVersion,
            salt: `run:${Date.now()}:${Object.keys(store.atlasHistoryById).length}`,
            seenRoundIds: atlasSeenRoundIds(Object.values(store.atlasHistoryById))
          })
        : null;
    const selectedIds =
      mode === "sample"
        ? sampleRunRoundIds(data.rounds)
        : mode === "daily"
          ? freeDailyRoundIds(dailyManifestIds)
          : mode === "atlas"
            ? (atlasSelection?.roundIds ?? [])
        : mode === "archive"
          ? dailyManifestIds
          : mode === "challenge" && challengePayload
            ? challengePayload.roundIds
            : options.practiceRoundIds ?? selectedPracticeRounds.map((round) => round.id);
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
      salt:
        mode === "sample"
          ? "evergreen"
          : mode === "practice"
            ? (options.practiceSalt ?? practiceSalt)
            : mode === "atlas"
              ? `atlas:${Date.now()}:${Object.keys(store.atlasHistoryById).length}`
              : mode === "challenge"
                ? challengePayload?.checksum
                : undefined
    });
    await ensureIndicators(nextRun.rounds.map((round) => round.correctIndicatorId));
    setRun(nextRun);
    trackCanYouGeoEvent("cgy_game_start", {
      run_mode: mode,
      tier: nextRun.tier,
      round_count: nextRun.rounds.length,
      source: mode === "challenge" ? "challenge" : isArchiveDate ? "past_game" : "lobby"
    });
    setShowFirstRunIntro((mode === "sample" || mode === "daily" || mode === "atlas") && !store.onboardingComplete);
    setSelectedCountryIso3("");
    setMasterGuess("");
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  async function replayCompletedRun(sourceRun: RunState) {
    if (!data) return;
    if (sourceRun.mode === "daily" && !canUseFullPractice) return;
    const replayMode: RunMode = sourceRun.mode === "daily" ? "practice" : sourceRun.mode;
    const roundIds = sourceRun.rounds.map((round) => ({
      roundId: round.roundId,
      correctIndicatorId: round.correctIndicatorId
    }));
    const replay = createRun({
      mode: replayMode,
      dateKey: sourceRun.dateKey,
      contentVersion: sourceRun.contentVersion,
      tier: sourceRun.tier,
      roundIds,
      salt: `replay:${Date.now()}:${sourceRun.id}`
    });
    await ensureIndicators(replay.rounds.map((round) => round.correctIndicatorId));
    setRun(replay);
    trackCanYouGeoEvent("cgy_game_start", {
      run_mode: replay.mode,
      tier: replay.tier,
      round_count: replay.rounds.length,
      source: sourceRun.mode === "challenge" ? "challenge_replay" : "result_replay"
    });
    setShowFirstRunIntro(false);
    setSelectedCountryIso3("");
    setMasterGuess("");
    setShareStatus("");
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  const returnToLobby = useCallback((targetId?: string) => {
    setRun(null);
    setShowFirstRunIntro(false);
    setShareStatus("");
    window.requestAnimationFrame(() => {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
        return;
      }
      window.scrollTo(0, 0);
    });
  }, []);

  useEffect(() => {
    function handlePlayLobbyRequest() {
      returnToLobby();
    }
    window.addEventListener(PLAY_LOBBY_REQUEST_EVENT, handlePlayLobbyRequest);
    return () => window.removeEventListener(PLAY_LOBBY_REQUEST_EVENT, handlePlayLobbyRequest);
  }, [returnToLobby]);

  function dispatch(action: Parameters<typeof reduceRun>[1]) {
    setRun((current) => {
      if (!current) return current;
      const currentRound = activeRound(current);
      const next = reduceRun(current, action);
      if (action.type === "submit") {
        const nextRound = next.rounds[current.currentRoundIndex];
        trackCanYouGeoEvent("cgy_round_answered", {
          run_mode: current.mode,
          tier: current.tier,
          round_number: current.currentRoundIndex + 1,
          round_count: current.rounds.length,
          correct: action.correct,
          score: nextRound?.score ?? currentRound?.score ?? 0
        });
      }
      if (current.status !== "complete" && next.status === "complete") {
        trackCanYouGeoEvent("cgy_game_complete", {
          run_mode: next.mode,
          tier: next.tier,
          round_count: next.rounds.length,
          score: next.rounds.reduce((sum, round) => sum + round.score, 0)
        });
      }
      return next;
    });
  }

  function dismissFirstRunIntro() {
    setStore((current) => {
      const next = { ...current, onboardingComplete: true };
      savePersistedState(next);
      return next;
    });
    setShowFirstRunIntro(false);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
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
      const challenger = challengeResult.payload.challenger;
      return (
        <section className="game-entry page-shell">
          <div className="entry-copy">
            <p className="eyebrow">Can You Geo? Challenge</p>
            <h1 className="page-title">Can you beat this map set?</h1>
            <p className="lead">
              This Mystery Map link locks the exact maps and skill tier. Challenge plays do not affect today&apos;s official Daily score or streak.
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
              The link is spoiler-safe: no answer labels, countries, or round solutions are shown before you play.
            </p>
            {challenger ? (
              <div className="challenge-score-card" aria-label="Score to beat">
                <span>Score to beat</span>
                <strong>
                  {challenger.score.toLocaleString("en-US")} / {challenger.possible.toLocaleString("en-US")}
                </strong>
                <p>
                  {challenger.rankTitle} · {challenger.solvedCount}/{challenger.roundCount} solved
                </p>
                <div className="challenge-result-strip" aria-label="Challenger result strip">
                  {Array.from(challenger.strip).map((cell, index) => (
                    <span key={`${cell}-${index}`} aria-hidden="true">
                      {cell}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <button className="button full-width" type="button" onClick={() => void startRun("challenge", challengeResult.payload)}>
              <Compass size={18} aria-hidden="true" />
              Play the challenge
            </button>
            <p className="challenge-safety-note">Challenge games save separately from today&apos;s Daily.</p>
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

  if (isArchiveDate && !signedIn) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <p className="eyebrow">Past Game replay</p>
          <h1>Start Pro or continue free to replay dated sets.</h1>
          <p>Guest play is limited to the fixed 5-map Sample Run. Pro unlocks the complete archive; Free can replay recent Past Games and save results.</p>
          <div className="button-row">
            <Link className="button" href="/upgrade">
              Start Pro
            </Link>
            <Link className="button-secondary" href="/sign-up">
              Create free account
            </Link>
            <Link className="button-secondary" href="/play/mystery-map">
              Try Sample Run
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!run) {
    const activeDateRun = isArchiveDate ? currentArchiveRun : currentDailyRun;
    const archiveRecord = isArchiveDate ? savedArchiveRecord(store, todayKey) : null;
    const reviewRecord = isArchiveDate ? archiveReviewRecord(archiveRecord, currentAccountArchiveRun, todayKey) : null;
    const todayRecord = !isArchiveDate ? store.dailyHistoryByDate[todayKey] ?? null : null;
    const completedDailyRun = !isArchiveDate && activeDateRun?.status === "complete" ? activeDateRun : null;
    const todayCompleted = Boolean(!isArchiveDate && (completedDailyRun || todayRecord));
    const nextDaily = nextDailyUnlockCopy();
    const bestDailyScore = bestDailyScoreForStore(store);
    const archiveRecordDate = formatRecordDate(archiveRecord?.completedAt);
    const dailyLabel = activeDateRun
        ? activeDateRun.status === "complete"
        ? isArchiveDate
          ? "View result"
          : "View today's result"
        : isArchiveDate
          ? "Continue replay"
          : "Continue today's 3 maps"
        : isArchiveDate
        ? archiveRecord
          ? "Replay for practice"
          : "Start dated replay"
        : "Start today's 3 maps";
    const selectedCount = canUseFullPractice ? selectedPracticeRounds.length : 0;
    const selectedDifficultyLabel = DIFFICULTY_LABELS[practiceDifficulty];
    const setReadyLabel = canUseFullPractice
      ? practiceMatches.length > 0
        ? practiceLabel(selectedDifficultyLabel, practiceCategory)
        : "Practice mode"
      : "Pro feature";
    const availablePracticeCount = Math.min(3, practiceMatches.length);
    const practiceWarning = canUseFullPractice ? rarePracticeNote(practiceMatches.length) : "";
    const currentAtlasActive = currentAtlasRun?.status === "active";
    const currentPracticeActive = canUseFullPractice && currentPracticeRun?.status === "active";
    const primaryMode: "sample" | "daily" | "atlas" = isProAccount ? "atlas" : isFreeAccount ? "daily" : "sample";
    const primaryModeComplete = primaryMode === "daily" ? todayCompleted : false;
    const primaryKicker = primaryMode === "atlas" ? "Unlimited Atlas" : primaryMode === "daily" ? "Today's Free Maps" : "Sample Run";
    const primaryHeading =
      primaryMode === "atlas"
        ? currentAtlasActive
          ? "Continue Pro Atlas"
          : "Start Pro Atlas"
        : primaryMode === "daily"
          ? currentDailyRun?.status === "active"
            ? "Resume today's 3 maps"
            : "Play today's 3 fresh maps"
          : "Try the 5-map Sample Run";
    const primaryCopy =
      primaryMode === "atlas"
        ? "5-map Atlas runs draw from the approved playable pool. Keep going after today's Free Daily."
        : primaryMode === "daily"
          ? "Your free account gets 3 fresh maps every day with saved results, progress, and streaks."
          : "No account needed. These sample maps never change, and the Sample Run does not save stats or streaks.";
    const primaryStateLabel =
      primaryMode === "atlas"
        ? currentAtlasActive
          ? "Atlas in progress"
          : "Pro ready"
        : primaryModeComplete
          ? "Today's 3 maps complete"
          : primaryMode === "daily"
            ? currentDailyRun?.status === "active"
              ? "Daily in progress"
              : "Ready today"
            : "5 fixed maps";
    const primaryNote =
      primaryMode === "atlas"
        ? `Unlimited Atlas uses ${PRO_ATLAS_ROUND_COUNT}-map runs and reshuffles after the full pool is complete.`
        : primaryMode === "daily"
          ? "Want more after today's 3 maps? Go Pro for unlimited Atlas play."
          : "Sign up for Pro for the full atlas, or sign up for a free account to play 3 fresh maps every day.";
    const primaryActionLabel =
      primaryMode === "atlas"
        ? currentAtlasActive
          ? "Continue Pro Atlas"
          : "Start Pro Atlas"
        : primaryMode === "daily"
          ? dailyLabel
          : "Try the 5-map Sample Run";
    const completedPrimaryLabel = isFreeAccount ? "Start Pro" : signedIn && practiceMatches.length > 0 ? "Play" : "Play Sample Run";
    const completedPrimaryDetail =
      completedPrimaryLabel === "Start Pro"
        ? "Go Pro for Full Practice Atlas, Pro Atlas, and more maps after today's Daily is complete."
        : completedPrimaryLabel === "Play"
          ? "Start or resume a Full Practice Atlas set. It will not change today's score or streak."
          : "Replay the fixed sample maps while tomorrow's Daily unlocks.";
    const resultActionLabel = completedDailyRun ? "View today's result" : "View saved stats";
    const practiceKicker = canUseFullPractice ? "Full Practice Atlas" : "Pro feature";
    const practiceTitle = "Full Practice Atlas";
    const practiceCopy = canUseFullPractice
      ? "Training sets by topic and difficulty. Never affects your Daily score or streak."
      : isFreeAccount
        ? "Practice by topic and difficulty is included with Pro. Free accounts include one fresh 3-map Daily each day."
        : "Try the Sample Run without an account, or start Pro for topic and difficulty practice.";
    const practiceReadyText = currentPracticeActive
      ? `Resume map ${(currentPracticeRun?.currentRoundIndex ?? 0) + 1} of ${currentPracticeRun?.rounds.length ?? PRO_ATLAS_ROUND_COUNT}`
      : selectedCount > 0
        ? practiceReadyLine(selectedCount)
        : practiceMatches.length > 0
          ? practiceReadyLine(availablePracticeCount)
          : canUseFullPractice
            ? practiceReadyLine(0)
            : "Included with Pro";
    const practiceStatusText = currentPracticeActive
      ? "Practice in progress"
      : canUseFullPractice
        ? selectedCount > 0
          ? practiceFlavor(practiceDifficulty)
          : practiceMatches.length > 0
            ? "Ready from these filters."
            : "Try another topic or difficulty."
        : "Practice does not change Daily score or streak.";
    const practiceActionLabel = currentPracticeActive ? "Resume practice" : "Start practice";
    if (reviewRequested) {
      if (reviewRecord) {
        return (
          <ArchiveReview
            record={reviewRecord}
            data={data}
            indicatorCache={indicatorCache}
            onReplay={() => void startArchivePracticeReplay()}
          />
        );
      }
      return (
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <p className="eyebrow">Past Game review</p>
            <h1>No saved result for {todayKey} yet.</h1>
            <p>Play this past game once to create a result, then return here to review it.</p>
            <div className="button-row">
              <button className="button" type="button" onClick={() => void startRun("archive")}>
                Start dated replay
              </button>
              <Link className="button-secondary" href="/past-games">
                Open past games
              </Link>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="game-entry page-shell" data-entry-mode={isArchiveDate ? "archive" : "daily"}>
        <div className="entry-copy">
          <EntryAtlasVisual
            map={data.map}
            indicator={indicatorCache[ENTRY_PREVIEW_INDICATOR_ID] ?? indicatorCache[data.manifest.indicators[0]?.id ?? ""]}
            countryNames={data.countryNames}
          />
          {isArchiveDate ? (
            <>
              <p className="eyebrow">{`Past Mystery Map Replay · ${todayKey}`}</p>
              <h1 className="page-title">What does this map measure?</h1>
              <p className="lead">
                Replay this past Mystery Map as a record run: five unlabeled maps, one hidden indicator each. Investigate countries when you need evidence,
                but every clue spends points.
              </p>
            </>
          ) : (
            <div className="setup-section setup-section-compact entry-skill-tier">
              <div className="setup-heading">
                <p className="setup-kicker">Skill tier</p>
                <p>Sets the answer list, clues, and investigations for Daily, Practice, and replays.</p>
              </div>
              <TierSelector value={selectedTier} onChange={updateTier} />
            </div>
          )}
          {data.dailyManifestIssue ? <p className="archive-note">{data.dailyManifestIssue}</p> : null}
        </div>
        <div className="entry-panel surface" aria-label={isArchiveDate ? undefined : "Mystery Map modes"}>
          {!isArchiveDate ? (
            <>
              <div className="mode-panel-heading lobby-heading">
                <p className="setup-kicker">Choose your game mode</p>
                <h2>Ready to read the map?</h2>
                <p>Press play for the freshest Can You Geo run available to you. Other modes stay nearby when you want them.</p>
              </div>
              <article className="lobby-primary-card" data-state={primaryModeComplete ? "complete" : "ready"} aria-label="Primary Mystery Map action">
                <div className="lobby-primary-copy">
                  <p className="setup-kicker">{primaryKicker}</p>
                  <h3>{primaryModeComplete ? "Today's maps complete" : primaryHeading}</h3>
                  <p>{primaryModeComplete ? "Your Daily score is locked. Keep playing without changing today's streak." : primaryCopy}</p>
                  <span className="mode-state-pill">{primaryModeComplete ? "Today's maps complete" : primaryStateLabel}</span>
                </div>
                {primaryModeComplete ? (
                  <div className="daily-return-hook" aria-label="Daily return summary">
                    <div>
                      <span>Current streak</span>
                      <strong>{store.streak.current}</strong>
                    </div>
                    <div>
                      <span>Best Daily</span>
                      <strong>{bestDailyScore === null ? "—" : bestDailyScore.toLocaleString("en-US")}</strong>
                    </div>
                    <p>
                      <strong>{nextDaily.headline}</strong> {nextDaily.body}
                    </p>
                    <p>{completedPrimaryDetail}</p>
                  </div>
                ) : (
                  <p className="mode-card-note">{primaryNote}</p>
                )}
                <div className="lobby-primary-actions">
                  {primaryModeComplete ? (
                    completedPrimaryLabel === "Start Pro" ? (
                      <Link className="button lobby-play-button" href="/upgrade">
                        <span className="lobby-play-main">{completedPrimaryLabel}</span>
                      </Link>
                    ) : (
                      <button
                        className="button lobby-play-button"
                        type="button"
                        onClick={() => {
                          if (completedPrimaryLabel === "Play") void startPracticeRun();
                          else void startRun("sample");
                        }}
                      >
                        <span className="lobby-play-main">{completedPrimaryLabel}</span>
                      </button>
                    )
                  ) : (
                    <button className="button lobby-play-button" type="button" onClick={() => void startRun(primaryMode)}>
                      <span className="lobby-play-main">PLAY</span>
                      <small>{primaryActionLabel}</small>
                    </button>
                  )}
                  {primaryMode === "atlas" && !todayCompleted ? (
                    <button className="button-secondary" type="button" onClick={() => void startRun("daily")}>
                      Play today&apos;s 3 maps
                    </button>
                  ) : null}
                  {isGuest ? (
                    <Link className="button-secondary" href="/sign-up">
                      Create free account
                    </Link>
                  ) : null}
                  {!isProAccount && !primaryModeComplete ? (
                    <Link className="button-secondary" href="/upgrade">
                      {isGuest ? "Start Pro" : "Go Pro for unlimited Atlas play"}
                    </Link>
                  ) : null}
                  {isGuest ? (
                    <Link className="button-secondary" href="/sign-in">
                      Sign in
                    </Link>
                  ) : null}
                </div>
              </article>
              <section className="lobby-secondary" aria-label="More ways to play">
                <div className="mode-panel-heading mode-panel-heading-secondary">
                  <p className="setup-kicker">More ways to play</p>
                  <h2>Choose a side route.</h2>
                  <p>Practice, replay, and stats are here when you want them. None of these changes today&apos;s Daily score.</p>
                </div>
                <div className="lobby-secondary-actions">
                  {todayCompleted ? (
                    completedDailyRun ? (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => {
                          setRun(completedDailyRun);
                          window.requestAnimationFrame(() => window.scrollTo(0, 0));
                        }}
                      >
                        {resultActionLabel}
                      </button>
                    ) : signedIn ? (
                      <Link className="button-secondary" href="/account/stats">
                        {resultActionLabel}
                      </Link>
                    ) : null
                  ) : null}
                  {completedDailyRun && canUseFullPractice ? (
                    <button className="button-secondary" type="button" onClick={() => void replayCompletedRun(completedDailyRun)}>
                      Replay for practice
                    </button>
                  ) : null}
                </div>
                <div className="mode-card-grid mode-card-grid-secondary">
                  <article className="mode-card mode-card-practice" id="practice-atlas">
                    <div>
                      <p className="setup-kicker">{practiceKicker}</p>
                      <h3>{practiceTitle}</h3>
                      <p>{practiceCopy}</p>
                    </div>
                    {canUseFullPractice ? (
                      <div className="practice-filters">
                        <label htmlFor="practice-category">
                          Topic
                          <select id="practice-category" value={practiceCategory} onChange={(event) => updatePracticeCategory(event.target.value)}>
                            <option value="">Any topic · {roundCountForFilters(data.rounds, "")} maps</option>
                            {practiceCategoryOptions.map((option) => (
                              <option key={option.category} value={option.category}>
                                {option.category} · {option.count} maps
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
                            {practiceDifficultyOptions.map((option) => (
                              <option key={option.difficulty} value={option.difficulty}>
                                {DIFFICULTY_LABELS[option.difficulty]} · {option.count} maps
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                    <div className="practice-set-card" data-status={currentPracticeActive || selectedCount > 0 ? "ready" : "empty"} aria-live="polite">
                      <span>{setReadyLabel}</span>
                      <strong>{practiceReadyText}</strong>
                      <p>{practiceStatusText}</p>
                      {practiceWarning ? <p className="practice-warning">{practiceWarning}</p> : null}
                    </div>
                    <div className="practice-actions">
                      {canUseFullPractice ? (
                        <button className="button practice-start-button" type="button" disabled={practiceMatches.length === 0} onClick={() => void startPracticeRun()}>
                          {practiceActionLabel}
                        </button>
                      ) : isGuest ? (
                        <Link className="button practice-start-button" href="/sign-up">
                          Create free account
                        </Link>
                      ) : (
                        <Link className="button practice-start-button" href="/upgrade">
                          Start Pro
                        </Link>
                      )}
                      {canUseFullPractice ? (
                        <button className="button-secondary" type="button" disabled={practiceMatches.length === 0} onClick={buildPracticeSet}>
                          <Shuffle size={17} aria-hidden="true" />
                          Shuffle set
                        </button>
                      ) : isGuest ? (
                        <Link className="button-secondary" href="/upgrade">
                          Start Pro
                        </Link>
                      ) : null}
                    </div>
                  </article>
                  <article className="mode-card mode-card-past">
                    <div>
                      <p className="setup-kicker">Past Games</p>
                      <h3>Past Games</h3>
                      <p>
                        {isProAccount
                          ? "Dated Daily replays. Replays never change today's Daily score or streak."
                          : isGuest
                            ? "Create an account for today's Daily. Pro unlocks Past Games."
                            : "Pro unlocks dated Daily replays. Free stays focused on today's 3-map Daily."}
                      </p>
                    </div>
                    <div className="mode-card-actions">
                      <Link className="button-secondary" href={isProAccount ? "/past-games" : isGuest ? "/sign-up" : "/upgrade"}>
                        {isProAccount ? "Open past games" : isGuest ? "Create free account" : "Start Pro"}
                      </Link>
                      {signedIn ? (
                        <Link className="button-secondary" href="/account/stats">
                          View saved stats
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="setup-section">
                <div className="setup-heading">
                  <p className="setup-kicker">Skill tier</p>
                  <p>Pick how much help you want for this replay.</p>
                </div>
                <TierSelector value={selectedTier} onChange={updateTier} />
              </div>
              <div className="archive-banner">
                <p className="setup-kicker">Past Mystery Map Replay</p>
                <h2>{todayKey}</h2>
                <p>
                  This fixed 5-map set is a Past Game for the date. Review your result, replay for practice, or chase a personal best. Past replays never
                  change today&apos;s Daily score or streak.
                </p>
                <div className="archive-record-summary" data-state={archiveRecord ? "saved" : "empty"} aria-label="Past game record">
                  <span>{archiveRecord ? "Saved result" : "No result yet"}</span>
                  <strong>{archiveRecord ? `${archiveRecord.bestScore.toLocaleString("en-US")} points` : "Play this past game"}</strong>
                  <p>
                    {archiveRecord
                      ? `${TIER_CONFIGS[archiveRecord.tier].shortLabel}${archiveRecordDate ? ` · saved ${archiveRecordDate}` : ""}`
                      : "Play the fixed map set once or practice without changing today's streak."}
                  </p>
                </div>
              </div>
              <div className="button-row archive-start-row">
                {reviewRecord ? (
                  <>
                    <Link className="button" href={`/play/mystery-map/${todayKey}?review=1`}>
                      View result
                    </Link>
                    <button className="button-secondary" type="button" onClick={() => void startArchivePracticeReplay()}>
                      Replay for practice
                    </button>
                  </>
                ) : (
                  <button className="button" type="button" onClick={() => void startRun("archive")}>
                    <Compass size={18} aria-hidden="true" />
                    {dailyLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  if (run.status === "complete") {
    return (
      <CompletionSummary
        run={run}
        store={store}
        onBack={() => returnToLobby()}
        onPractice={() => {
          if (entryMode === "challenge") {
            router.push("/play/mystery-map/#practice-atlas");
            return;
          }
          returnToLobby("practice-atlas");
        }}
        onReplay={() => void replayCompletedRun(run)}
        shareStatus={shareStatus}
        setShareStatus={setShareStatus}
        cloudSaveStatus={cloudSaveStatus}
        accountClient={account.client}
        signedIn={signedIn}
        canUseFullPractice={canUseFullPractice}
        challengeTarget={entryMode === "challenge" && challengeResult.ok ? challengeResult.payload.challenger : undefined}
      />
    );
  }

  if (
    showFirstRunIntro &&
    (run.mode === "sample" || run.mode === "daily" || run.mode === "atlas") &&
    run.currentRoundIndex === 0 &&
    run.rounds[0]?.phase === "active"
  ) {
    return <FirstRunIntro tier={run.tier} onContinue={dismissFirstRunIntro} />;
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
  const revealedEvidence = roundState.investigations.filter((item) => item.cost > 0);
  const selectedCountryValue = selectedCountry?.iso3 ? indicator.valuesByIso3[selectedCountry.iso3] ?? null : null;
  const selectedCountryInvestigation = selectedCountry?.iso3
    ? roundState.investigations.find((item) => item.iso3 === selectedCountry.iso3)
    : null;
  const selectedCountryHasData = selectedCountry ? selectedCountryValue !== null : false;
  const selectedCountryAlreadyRevealed = Boolean(selectedCountryInvestigation);
  const revealDisabled =
    !selectedCountry || (selectedCountryHasData && !selectedCountryAlreadyRevealed && investigationPenalty === null);
  const selectedCountryRevealCost = !selectedCountry
    ? null
    : selectedCountryAlreadyRevealed
      ? "No points"
      : selectedCountryHasData
        ? investigationPenalty === null
          ? "No reveals left"
          : `${investigationPenalty} points`
        : "0 points";
  const selectedCountryActionText = selectedCountry
    ? selectedCountryAlreadyRevealed
      ? `Show ${selectedCountry.name}'s value`
      : selectedCountryHasData
        ? investigationPenalty === null
          ? "Country reveals used up"
          : `Reveal ${selectedCountry.name}'s value - ${selectedCountryRevealCost}`
        : `Confirm ${selectedCountry.name} has no data - 0 points`
    : "Reveal selected country value";
  const selectedCountryPrompt = selectedCountry
    ? selectedCountryAlreadyRevealed
      ? selectedCountryInvestigation?.value === null
        ? "No data for this country on this map. Try another one."
        : `Revealed: ${formatValue(selectedCountryInvestigation?.value ?? selectedCountryValue ?? 0, indicator)}`
      : selectedCountryHasData
        ? "Reveal its value when the pattern needs evidence."
        : "This country has no data on this map. Confirm it for no points."
    : "";

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
  const savedScoreDetail =
    runStats.mapsPlayed === 0
      ? "No maps solved yet."
      : `After ${runStats.mapsPlayed} completed map${runStats.mapsPlayed === 1 ? "" : "s"}.`;
  const possibleTotal = runStats.score + roundState.score;
  const latestRejectedAnswer = roundState.rejectedAnswers.at(-1) ?? null;
  const feedbackText = roundState.feedback ?? "";
  const showIncorrectFeedback = Boolean(latestRejectedAnswer && feedbackText.toLowerCase().includes("incorrect"));
  const wrongAnswerPenalty = config.scoring.wrongAnswerPenalty;
  const scoreSpendEvent = latestInvestigation?.cost
    ? `-${latestInvestigation.cost}`
    : showIncorrectFeedback
      ? `-${wrongAnswerPenalty}`
      : feedbackText.toLowerCase().includes("unit clue revealed")
      ? `-${config.scoring.unitCluePenalty}`
      : null;

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
    <section className="play-layout page-shell" data-layout="dashboard">
      <div className="play-control-panel surface" aria-label="Round dashboard">
        <div className="game-task-header">
          <div className="round-kicker">
            <span>
              Round {run.currentRoundIndex + 1} of {run.rounds.length}
            </span>
            <span>{config.label}</span>
            <span>
              {run.mode === "daily"
                ? `Free Daily #${challengeNumber(run.dateKey)}`
                : run.mode === "sample"
                  ? "Sample Run"
                  : run.mode === "atlas"
                    ? "Pro Atlas"
                : run.mode === "archive"
                  ? `Past Mystery Map Replay ${run.dateKey}`
                  : run.mode === "challenge"
                    ? "Mystery Map Challenge"
                    : "Mystery Map Practice"}
            </span>
          </div>
          <div>
            <p className="eyebrow">Your task</p>
            <h1 id="active-map-title">What does this map measure?</h1>
            <p>Read the map pattern, spend points only when evidence helps, then lock the answer.</p>
          </div>
        </div>
        {selectedCountry ? (
          <div className="selected-country-card selected-country-action-card" data-state="selected" data-layout="immediate" aria-live="polite">
            <div className="selected-country-action-copy">
              <span>Selected: {selectedCountry.name}</span>
              <strong>{selectedCountry.name}</strong>
              <p>{selectedCountryPrompt}</p>
              <small>
                {selectedCountryAlreadyRevealed
                  ? "No points spent this time."
                  : selectedCountryHasData
                    ? selectedCountryRevealCost === "No reveals left"
                      ? "Country reveals used up for this round."
                      : `Reveal cost: ${selectedCountryRevealCost}.`
                    : "Reveal cost: 0 points."}
              </small>
            </div>
            <button
              className="button selected-country-reveal-button"
              type="button"
              aria-label={selectedCountryActionText}
              disabled={revealDisabled}
              onClick={() => selectedCountry.iso3 && investigate(selectedCountry.iso3, selectedCountry.name)}
            >
              <Search size={18} aria-hidden="true" />
              {selectedCountryActionText}
            </button>
          </div>
        ) : null}
        <div className="score-hud" aria-label="Score status">
          <div className="score-hud-card score-hud-current">
            <span>This map</span>
            <strong key={roundState.score} data-score-tone={roundState.score < 0 ? "negative" : "positive"}>
              <span className="score-number">{roundState.score}</span> available
            </strong>
            <small>Not banked until solved.</small>
            {scoreSpendEvent ? (
              <em className="score-spend-flyout" key={`${roundState.score}-${feedbackText}-${latestInvestigation?.iso3 ?? "unit"}`} aria-hidden="true">
                {scoreSpendEvent}
              </em>
            ) : null}
          </div>
          <div className="score-hud-card score-hud-banked">
            <span>Saved score</span>
            <strong>
              <span className="score-number">{runStats.score}</span> points
            </strong>
            <small>{savedScoreDetail}</small>
          </div>
          <div className="score-hud-card score-hud-possible">
            <span>Possible total</span>
            <strong>
              <span className="score-number">{possibleTotal}</span> if solved now
            </strong>
          </div>
        </div>
        <div className="clue-dashboard" aria-label="Clue costs">
          <div className="clue-summary-card">
            <span>Country clue</span>
            <strong>
              {investigationPenalty === null ? "Used up" : `${investigationPenalty} points`}
            </strong>
            <p>{config.maxInvestigations - paidInvestigationCount} of {config.maxInvestigations} country reveals left.</p>
          </div>
        </div>
        <div className="run-stats-card" aria-label="Run details">
          <span>Run details</span>
          <dl>
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
        <div className="investigation-box">
          <h2>Investigate a country</h2>
          <p className="cost-note">
            Use this when the pattern gets slippery. Selecting a country is free; revealing a value spends the listed points.
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
          {!selectedCountry ? (
            <button className="button-secondary full-width investigate-button" type="button" aria-label="Reveal selected country value" disabled>
              <Search size={18} aria-hidden="true" />
              Reveal value
            </button>
          ) : null}
          <p className="cost-note">
            {selectedCountry
              ? "Reveal from the selected-country panel above, or choose another country here."
              : investigationPenalty === null
                ? "Country reveals used up for this round."
                : `Next reveal costs ${investigationPenalty} points.`}
          </p>
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {showIncorrectFeedback ? "" : feedbackText}
        </div>
      </div>
      <div className="play-map-panel" aria-label="Map evidence">
        <div className="map-evidence-header">
          <div>
            <p className="eyebrow">Map evidence</p>
            <h2>Read the color pattern.</h2>
          </div>
          <div className="map-key-inline" aria-label="Map key">
            <span>Darker = larger value</span>
            <span>Hatched = no data</span>
          </div>
        </div>
        <WorldMap
          map={data.map}
          indicator={indicator}
          countryNames={data.countryNames}
          investigatedIso3={roundState.investigations.map((item) => item.iso3)}
          selectedIso3={selectedCountryIso3}
          onCountryClick={(country) => selectCountry(country.iso3)}
          labelledBy="active-map-title"
        />
        <div className="inspection-readout" data-state={revealedEvidence.length > 0 ? "evidence" : "empty"} aria-live="polite">
          {revealedEvidence.length > 0 ? (
            <>
              <div className="inspection-readout-heading">
                <span>Revealed evidence</span>
                <p>Compare the countries you spent points to reveal.</p>
              </div>
              <div className="revealed-country-strip" aria-label="Revealed country evidence">
                {revealedEvidence.map((item, index) => (
                  <article className="revealed-country-chip" key={`${item.iso3}-${index}`}>
                    <span>-{item.cost} points</span>
                    <strong>{item.countryName}</strong>
                    <p>{item.value === null ? "No data" : formatValue(item.value, indicator)}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <span>Ready</span>
              <strong>Pick a country</strong>
              <p>Click the map or use the country search to collect evidence.</p>
            </>
          )}
        </div>
        <div className="play-action-dock surface" data-state={showIncorrectFeedback ? "miss" : "choosing"} aria-label="Answer actions">
          <div className="answer-box primary-answer-box" data-placement="dock">
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
                <div className="answer-box-heading">
                  <div>
                    <span>Pick one answer</span>
                    <h2>Which indicator is this?</h2>
                  </div>
                  <small>Wrong answers cost {wrongAnswerPenalty} points.</small>
                </div>
                {config.unitClue && unitClue.eligible ? (
                  <div className="answer-clue-row" data-clue="unit">
                    <div>
                      <span>Optional clue</span>
                      <p>{roundState.unitClueUsed ? unitClue.text : "Reveal the measurement units when the scale is the missing piece."}</p>
                    </div>
                    <button
                      className="button-secondary answer-unit-button"
                      type="button"
                      aria-label={roundState.unitClueUsed ? "Unit clue revealed" : `Reveal unit: -${config.scoring.unitCluePenalty}`}
                      disabled={roundState.unitClueUsed}
                      onClick={() => dispatch({ type: "unitClue" })}
                    >
                      <Lightbulb size={18} aria-hidden="true" />
                      <span>{roundState.unitClueUsed ? "Unit revealed" : "Reveal units"}</span>
                      {!roundState.unitClueUsed ? <small>-{config.scoring.unitCluePenalty} points</small> : null}
                    </button>
                  </div>
                ) : null}
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
              <em>-{wrongAnswerPenalty} points</em>
              <p>{feedbackText} Cross it off and read the remaining signal.</p>
            </div>
          ) : null}
        </div>
        {showIncorrectFeedback ? (
          <div className="miss-moment-overlay" key={latestRejectedAnswer?.id ?? feedbackText} aria-hidden="true">
            <span>Miss</span>
            <strong>Not this map</strong>
            <em>-{wrongAnswerPenalty} points</em>
          </div>
        ) : null}
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
  const revealEyebrow = resultTone === "correct" ? "Correct" : "Answer found";
  const revealHeadline = resultTone === "correct" ? "Solved" : "Answer found";
  const startPoints = TIER_CONFIGS[run.tier].scoring.start;
  const countryClueSpend = roundState.investigations.reduce((total, item) => total + Math.max(0, item.cost), 0);
  const unitClueSpend = roundState.unitClueUsed ? TIER_CONFIGS[run.tier].scoring.unitCluePenalty : 0;
  const clueSpend = countryClueSpend + unitClueSpend;
  const wrongAnswerSpend = missedAnswerCount * TIER_CONFIGS[run.tier].scoring.wrongAnswerPenalty;
  const nextMapNumber = run.currentRoundIndex + 2;
  const finalRoundSolved = run.currentRoundIndex + 1 >= run.rounds.length;
  const hasInvestigationHistory = roundState.unitClueUsed || roundState.investigations.length > 0;
  const transitionPips = Array.from({ length: run.rounds.length }, (_, index) => index);
  const onNextRef = useRef(onNext);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (!finalRoundSolved) return;
    const timeoutId = window.setTimeout(() => onNextRef.current(), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [finalRoundSolved]);

  return (
    <section className="reveal-layout page-shell">
      <div className="reveal-panel surface" aria-label="Reveal details">
        <div className="round-result-banner" data-result={resultTone} role="status" aria-live="polite">
          <span>{missedAnswerCount > 0 ? "Answer revealed" : "Correct"}</span>
          <strong>{missedAnswerCount > 0 ? indicator.shortTitle : "Solved."}</strong>
          <p className={missedAnswerCount > 0 ? "correct-answer-line" : undefined}>
            {missedAnswerCount > 0
              ? `Correct answer: ${indicator.shortTitle}. ${missedAnswerCount} wrong ${missedAnswerCount === 1 ? "read" : "reads"} ruled out.`
              : `Sharp read. The hidden map was ${indicator.shortTitle}.`}
          </p>
          <em>{scoreText}</em>
          <div className="banked-score-flight" aria-hidden="true">
            {scoreText} banked
          </div>
        </div>
        <div className="reveal-action-dock" aria-label="Round action">
          <div className="round-transition-card" data-final={finalRoundSolved ? "true" : "false"}>
            <span>{finalRoundSolved ? "Daily complete" : `Map ${nextMapNumber} of ${run.rounds.length}`}</span>
            <strong>{finalRoundSolved ? "Score locked. Opening results..." : "Next mystery loading."}</strong>
            <em>Banked {scoreText}</em>
            <div className="transition-pips" aria-hidden="true">
              {transitionPips.map((index) => (
                <i key={index} data-state={index <= run.currentRoundIndex ? "banked" : index === run.currentRoundIndex + 1 ? "next" : "locked"} />
              ))}
            </div>
            <small>{finalRoundSolved ? "Every map is scored. Your result is opening now." : "Preparing the next hidden statistic."}</small>
          </div>
          <button className="button full-width next-map-button" type="button" onClick={onNext}>
            {finalRoundSolved ? "Open results now" : "Next map"}
          </button>
        </div>
        <div className="reveal-dashboard-grid">
          <div className="reveal-scoreline">
            <span>Correct indicator</span>
            <strong>{indicator.shortTitle}</strong>
            <small>{resultLabel}</small>
          </div>
          <dl className="point-breakdown" aria-label="Point breakdown">
            <div>
              <dt>Started</dt>
              <dd>{startPoints.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Clues</dt>
              <dd>{clueSpend ? `-${clueSpend.toLocaleString("en-US")}` : "0"}</dd>
            </div>
            <div>
              <dt>Misses</dt>
              <dd>{wrongAnswerSpend ? `-${wrongAnswerSpend.toLocaleString("en-US")}` : "0"}</dd>
            </div>
            <div>
              <dt>Earned</dt>
              <dd>{scoreText}</dd>
            </div>
          </dl>
        </div>
        <details className="lesson-card lesson-card-strong reveal-key-evidence">
          <summary id="showing-heading">What the map was showing</summary>
          <p>{indicator.editorial.patternNote}</p>
        </details>
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
      </div>
      <div className="reveal-map" data-result={resultTone}>
        <p className="eyebrow">Map reveal</p>
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
          <span>{revealEyebrow}</span>
          <strong>{revealHeadline}</strong>
          <em>{scoreText}</em>
        </div>
        {resultTone === "correct" ? (
          <video className="correct-burst-video" autoPlay muted playsInline preload="none" aria-hidden="true">
            <source src="/worldprint/correct-burst.webm" type="video/webm" />
          </video>
        ) : null}
        <div className="result-atlas-burst" data-result={resultTone} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
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

function ArchiveReview({
  record,
  data,
  indicatorCache,
  onReplay
}: {
  record: ArchiveReviewRecord;
  data: LoadedData;
  indicatorCache: Record<string, IndicatorArtifact>;
  onReplay: () => void;
}) {
  const rank = scoreRank(record.bestScore, record.roundCount);
  const details = record.roundDetails ?? [];
  const hasRoundDetails = details.length > 0;
  const roundCount = Math.max(record.roundCount, details.length, record.roundScores.length);
  const totalClueSpend = details.reduce((sum, detail) => sum + detail.clueSpend, 0);
  const totalMisses = details.reduce((sum, detail) => sum + detail.misses, 0);
  const roundNumbers = Array.from({ length: roundCount }, (_, index) => index + 1);
  const tierLabel = record.tier ? TIER_CONFIGS[record.tier].shortLabel : "Unknown tier";
  const savedDate = formatRecordDate(record.completedAt);

  return (
    <section className="archive-review-page page-shell" aria-label="Past Game result review">
      <div className="archive-review-hero surface">
        <div>
          <p className="eyebrow">Past Game result</p>
          <h1 className="page-title">Review {record.dateKey}.</h1>
          <p className="lead">
            Historical result only. Replay for practice starts a separate attempt and will not change today&apos;s Daily score.
          </p>
        </div>
        <div className="archive-review-score">
          <span>{rank.title}</span>
          <strong>{record.bestScore.toLocaleString("en-US")}</strong>
          <p>
            {record.savedState}
            {savedDate ? ` · saved ${savedDate}` : ""}
          </p>
        </div>
      </div>
      <dl className="archive-review-stats surface" aria-label="Past Game summary">
        <div>
          <dt>Date</dt>
          <dd>{record.dateKey}</dd>
        </div>
        <div>
          <dt>Tier</dt>
          <dd>{tierLabel}</dd>
        </div>
        <div>
          <dt>Maps completed</dt>
          <dd>{record.roundCount}</dd>
        </div>
        <div>
          <dt>Correct</dt>
          <dd>{record.correctCount}</dd>
        </div>
        <div>
          <dt>Misses</dt>
          <dd>{hasRoundDetails ? totalMisses : "Not saved"}</dd>
        </div>
        <div>
          <dt>Clue spend</dt>
          <dd>{hasRoundDetails ? totalClueSpend.toLocaleString("en-US") : "Not saved"}</dd>
        </div>
      </dl>
      <div className="archive-review-actions">
        <Link className="button" href="/play/mystery-map">
          Play today&apos;s Daily
        </Link>
        <Link className="button-secondary" href="/play/mystery-map#practice-atlas">
          Practice Atlas
        </Link>
        <button className="button" type="button" onClick={onReplay}>
          Replay for practice
        </button>
        <Link className="button-secondary" href="/past-games">
          Open past games
        </Link>
      </div>
      <section className="archive-review-rounds" aria-label="Round timeline">
        <div className="section-heading">
          <p className="eyebrow">5-map timeline</p>
          <h2>Round by round.</h2>
        </div>
        {!hasRoundDetails ? (
          <div className="archive-review-fallback surface">
            <strong>Round detail was not saved for this older run.</strong>
            <p>We can still show the saved score summary. New completed runs will save round-level detail for this review.</p>
          </div>
        ) : null}
        <div className="archive-review-round-grid">
          {roundNumbers.map((roundNumber, index) => {
            const detail = details[index];
            const score = detail?.score ?? record.roundScores[index] ?? null;
            const summary = detail ? data.indicators.get(detail.correctIndicatorId) : null;
            const indicator = detail ? indicatorCache[detail.correctIndicatorId] : null;
            const title = indicator?.shortTitle ?? summary?.shortTitle ?? summary?.title ?? "Round detail unavailable";
            const source = indicator?.source;
            return (
              <article key={roundNumber} className="archive-review-round-card surface" data-result={detail?.result ?? "summary"}>
                <div className="archive-review-round-heading">
                  <span>Map {roundNumber}</span>
                  <strong>{score === null ? "Score not saved" : `${score.toLocaleString("en-US")} points`}</strong>
                </div>
                {detail ? (
                  <>
                    <dl>
                      <div>
                        <dt>State</dt>
                        <dd>{reviewResultLabel(detail)}</dd>
                      </div>
                      <div>
                        <dt>Indicator</dt>
                        <dd>{title}</dd>
                      </div>
                      <div>
                        <dt>Final guess</dt>
                        <dd>{title}</dd>
                      </div>
                      <div>
                        <dt>Misses</dt>
                        <dd>{detail.misses}</dd>
                      </div>
                      <div>
                        <dt>Clue spend</dt>
                        <dd>{detail.clueSpend}</dd>
                      </div>
                      <div>
                        <dt>Country clues</dt>
                        <dd>{detail.countryClues.length ? detail.countryClues.map((clue) => clue.countryName).join(", ") : "None"}</dd>
                      </div>
                    </dl>
                    {detail.rejectedAnswers.length ? (
                      <p className="archive-review-misses">Wrong guesses: {detail.rejectedAnswers.map((answer) => answer.label).join(", ")}</p>
                    ) : null}
                    <p className="archive-review-source">
                      Source:{" "}
                      {source ? (
                        <a href={source.sourceReference} target="_blank" rel="noreferrer">
                          {source.provider} · {source.dataset}
                        </a>
                      ) : (
                        "Loading source details"
                      )}
                    </p>
                  </>
                ) : (
                  <p>Round detail was not saved for this older run.</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
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

function FirstRunIntro({ tier, onContinue }: { tier: Tier; onContinue: () => void }) {
  return (
    <section className="first-run-shell page-shell" aria-label="First run intro">
      <div className="first-run-card surface">
        <p className="eyebrow">Before map 1</p>
        <h1>Read the signal, then make the call.</h1>
        <p className="lead">
          You are starting on {TIER_CONFIGS[tier].label}. Keep your score clean, spend clues only when the map gets slippery, and pick the hidden
          indicator.
        </p>
        <ol className="first-run-beats" aria-label="How Mystery Map works">
          <li>
            <span>01</span>
            <strong>Read the map color pattern.</strong>
            <p>Darker countries carry the stronger signal.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Use clues if stuck.</strong>
            <p>Country values help, but every paid clue spends points.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Pick the hidden indicator.</strong>
            <p>Solve the map, bank the score, and move to the next one.</p>
          </li>
        </ol>
        <div className="first-run-actions">
          <button className="button" type="button" onClick={onContinue}>
            Start map 1
          </button>
          <button className="button-secondary" type="button" onClick={onContinue}>
            Skip intro
          </button>
        </div>
      </div>
    </section>
  );
}

function CompletionSummary({
  run,
  store,
  onBack,
  onPractice,
  onReplay,
  shareStatus,
  setShareStatus,
  cloudSaveStatus,
  accountClient,
  signedIn,
  canUseFullPractice,
  challengeTarget
}: {
  run: RunState;
  store: PersistedState;
  onBack: () => void;
  onPractice: () => void;
  onReplay: () => void;
  shareStatus: string;
  setShareStatus: (value: string) => void;
  cloudSaveStatus: string;
  accountClient: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
  canUseFullPractice: boolean;
  challengeTarget?: ChallengePayload["challenger"];
}) {
  const isSampleRun = run.mode === "sample";
  const isDailyRun = run.mode === "daily";
  const isAtlasRun = run.mode === "atlas";
  const isPastRecord = run.mode === "archive";
  const canReplayForPractice = !isDailyRun || canUseFullPractice;
  const canCreateChallenge = !isSampleRun;
  const challengeCode = canCreateChallenge ? encodeChallenge(challengePayloadFromRun(run)) : "";
  const challengeUrl = canCreateChallenge
    ? typeof window === "undefined"
      ? buildMysteryMapChallengeUrl(challengeCode)
      : buildMysteryMapChallengeUrl(challengeCode, window.location.origin)
    : "";
  const total = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const shareText = buildShareText(run, canCreateChallenge ? { challengeUrl } : {});
  const shareSummary = buildResultShareSummary(run);
  const challengeShareTarget = canCreateChallenge ? buildChallengeShareTarget(run, challengeUrl) : null;
  const emailChallengeHref = challengeShareTarget ? buildEmailChallengeHref(challengeShareTarget) : "";
  const challengeComparison = run.mode === "challenge" && challengeTarget ? challengeComparisonCopy(total, challengeTarget.score) : null;
  const challengeTargetScore = challengeTarget?.score ?? 0;
  const [resultCopyState, setResultCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [resultScoreLocked, setResultScoreLocked] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const bestRound = run.rounds.length ? Math.max(...run.rounds.map((round) => round.score)) : 0;
  const averageRound = run.rounds.length ? Math.round(total / run.rounds.length) : 0;
  const cleanReads = run.rounds.filter((round) => round.rejectedAnswers.length === 0).length;
  const wrongGuessCount = run.rounds.reduce((sum, round) => sum + round.rejectedAnswers.length, 0);
  const clueCount = run.rounds.reduce((sum, round) => sum + round.investigations.filter((item) => item.cost > 0).length + (round.unitClueUsed ? 1 : 0), 0);
  const cleanReadRate = run.rounds.length ? Math.round((cleanReads / run.rounds.length) * 100) : 0;
  const rank = scoreRank(total, run.rounds.length);
  const possibleRunScore = Math.max(1, run.rounds.length * 1000);
  const scorePercent = Math.max(0, Math.min(100, Math.round((total / possibleRunScore) * 100)));
  const accountSaveHeading = isSampleRun
    ? "Start Pro or continue free for fresh maps."
    : signedIn
    ? cloudSaveStatus.toLowerCase().includes("saved to your account")
      ? "Saved to your account."
      : cloudSaveStatus.toLowerCase().includes("failed")
      ? "Saved locally. Sync needs another try."
      : "Account save is on."
    : "Save your score and streak.";
  const saveNote = isSampleRun
    ? "Sample Run is not saved. Free accounts save Daily stats, progress, and streaks."
    : signedIn
    ? cloudSaveStatus.toLowerCase().includes("saved to your account")
      ? "Saved to your account."
      : "Account sync is active for completed runs."
    : "Local on this device. Sign in to save completed runs, stats, and streaks to your account.";
  const statsHeading = isSampleRun
    ? "Sample complete."
    : signedIn
    ? cloudSaveStatus.toLowerCase().includes("saved to your account")
      ? "Saved to your account."
      : "Account stats."
    : "Saved in this browser.";
  const handleHeroScoreComplete = useCallback(() => setResultScoreLocked(true), []);

  useEffect(() => {
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) setResultScoreLocked(true);
  }, [run.id, total]);

  useEffect(() => {
    if (resultCopyState === "idle") return undefined;
    const timeout = window.setTimeout(() => setResultCopyState("idle"), 2600);
    return () => window.clearTimeout(timeout);
  }, [resultCopyState]);

  useEffect(() => {
    if (!inviteModalOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setInviteModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inviteModalOpen]);

  function openChallengeInviteModal() {
    trackCanYouGeoEvent("cgy_share_clicked", { method: "challenge_email_modal", run_mode: run.mode });
    setInviteModalOpen(true);
    setInviteStatus(signedIn ? "" : "Sign in to send a one-time challenge email. Copy and mailto still work without an account.");
    setInviteSent(false);
  }

  async function sendChallengeEmailInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateChallenge) return;
    setInvitePending(true);
    setInviteStatus("");
    setInviteSent(false);
    const result = await requestChallengeEmailInvite({
      client: accountClient,
      signedIn,
      challengeCode,
      recipientEmail: inviteEmail,
      message: inviteMessage
    });
    setInvitePending(false);
    setInviteStatus(result.message);
    setInviteSent(result.ok);
    if (result.ok) {
      trackCanYouGeoEvent("cgy_challenge_created", { method: "server_email", run_mode: run.mode });
      setShareStatus(result.remaining === null ? "Challenge email sent." : `Challenge email sent. ${result.remaining} left today.`);
      setInviteEmail("");
      setInviteMessage("");
    }
  }

  async function shareChallenge() {
    if (!challengeShareTarget) return;
    try {
      if (navigator.share) {
        await navigator.share(challengeShareTarget);
        trackCanYouGeoEvent("cgy_share_clicked", { method: "native_share", run_mode: run.mode });
        trackCanYouGeoEvent("cgy_challenge_created", { method: "native_share", run_mode: run.mode });
        setShareStatus("Challenge shared.");
        return;
      }
      await navigator.clipboard.writeText(challengeUrl);
      trackCanYouGeoEvent("cgy_share_clicked", { method: "copy_fallback", run_mode: run.mode });
      trackCanYouGeoEvent("cgy_challenge_created", { method: "copy_fallback", run_mode: run.mode });
      setResultCopyState("copied");
      setShareStatus("Copied challenge link.");
    } catch {
      setResultCopyState("failed");
      setShareStatus("Copy the challenge link from the preview below.");
    }
  }

  async function copyChallengeLink() {
    if (!canCreateChallenge) return;
    try {
      await navigator.clipboard.writeText(challengeUrl);
      trackCanYouGeoEvent("cgy_share_clicked", { method: "copy_link", run_mode: run.mode });
      trackCanYouGeoEvent("cgy_challenge_created", { method: "copy_link", run_mode: run.mode });
      setResultCopyState("copied");
      setShareStatus("Copied challenge link.");
    } catch {
      setResultCopyState("failed");
      setShareStatus("Challenge link could not be copied.");
    }
  }

  const summaryLabel =
    isSampleRun
      ? "Sample Run complete"
      : isDailyRun
        ? `Today's Free Daily #${challengeNumber(run.dateKey)}`
        : isAtlasRun
          ? "Pro Atlas run complete"
          : run.mode === "archive"
        ? `Past Mystery Map Replay · ${run.dateKey}`
        : run.mode === "challenge"
          ? "Mystery Map Challenge complete"
          : "Mystery Map Practice complete";
  const reviewHref = run.mode === "daily" || run.mode === "archive" ? `/play/mystery-map/${run.dateKey}?review=1` : null;
  const nextDaily = nextDailyUnlockCopy();
  const bestDailyScore = bestDailyScoreForStore(store);

  return (
    <section className="summary-shell page-shell">
      <div className="summary-main">
        <div className="summary-ceremony-glow" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">{summaryLabel}</p>
        <h1 className="page-title final-score-title" aria-label={`${total.toLocaleString("en-US")} points`}>
          <AnimatedNumber value={total} onComplete={handleHeroScoreComplete} /> points
        </h1>
        <div className="summary-score-meter" aria-label={`${scorePercent}% of the maximum possible score`}>
          <span style={{ width: `${scorePercent}%` }} />
        </div>
        <div className="run-rank-card surface" aria-label="Run rank">
          <div className="rank-medallion" aria-hidden="true">
            {scorePercent}
          </div>
          <div className="run-rank-copy">
            <span>Run rank</span>
            <strong>{rank.title}</strong>
            <p>{rank.note}</p>
          </div>
        </div>
        <p className="lead">
          {isSampleRun
            ? "Sample Run complete. These maps never change, and the Sample Run does not save stats or streaks."
            : isPastRecord
              ? "Record entry saved for this fixed Past Game. "
              : ""}
          {!isSampleRun ? `${run.rounds.length} maps completed on ${TIER_CONFIGS[run.tier].label}. ` : ""}
          {isDailyRun ? `Daily streak: ${store.streak.current}.` : "Daily streaks are unaffected."}
        </p>
        {challengeComparison ? (
          <section className="challenge-comparison-card surface" data-result={challengeComparison.tone} aria-label="Challenge comparison">
            <div>
              <p className="eyebrow">Challenge comparison</p>
              <h2>{challengeComparison.headline}</h2>
              <p>{challengeComparison.body}</p>
            </div>
            <dl>
              <div>
                <dt>Your score</dt>
                <dd>{total.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>Score to beat</dt>
                <dd>{challengeTargetScore.toLocaleString("en-US")}</dd>
              </div>
            </dl>
          </section>
        ) : null}
        <section className="summary-retention-card surface" aria-label="Next Daily and streak">
          <div>
            <p className="eyebrow">{isSampleRun ? "Free or Pro" : isAtlasRun ? "Unlimited Atlas" : "Return tomorrow"}</p>
            <h2>{isSampleRun ? "Start Pro or continue free." : isAtlasRun ? "Start another Atlas run." : nextDaily.headline}</h2>
            <p>
              {isSampleRun
                ? "Pro opens the full atlas. A free account needs no card and saves Free Daily progress, stats, and streaks."
                : isAtlasRun
                  ? "Pro Atlas runs keep going after the daily set and draw from the full approved pool."
                  : nextDaily.body}
            </p>
          </div>
          {isSampleRun ? (
            <div className="button-row">
              <Link className="button" href="/upgrade">
                Start Pro
              </Link>
              <Link className="button-secondary" href="/sign-up">
                Create free account
              </Link>
            </div>
          ) : isAtlasRun ? (
            <button className="button" type="button" onClick={onBack}>
              Back to Atlas
            </button>
          ) : (
            <dl aria-label="Daily streak and best score">
              <div>
                <dt>Current streak</dt>
                <dd>{store.streak.current}</dd>
              </div>
              <div>
                <dt>Best Daily</dt>
                <dd>{bestDailyScore === null ? "—" : bestDailyScore.toLocaleString("en-US")}</dd>
              </div>
            </dl>
          )}
        </section>
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
          <div>
            <span>Wrong guesses</span>
            <strong>{wrongGuessCount}</strong>
          </div>
          <div>
            <span>Clues used</span>
            <strong>{clueCount}</strong>
          </div>
        </div>
        <div className="result-cells" aria-label="Per-round scores">
          {run.rounds.map((round, index) => {
            const roundScorePercent = Math.max(0, Math.min(100, Math.round((round.score / 1000) * 100)));
            return (
              <span key={round.roundId} data-best={round.score === bestRound ? "true" : "false"}>
                <small>{index + 1}</small>
                <strong>{round.score}</strong>
                <i style={{ width: `${roundScorePercent}%` }} aria-hidden="true" />
              </span>
            );
          })}
        </div>
        <div className="result-locked-actions" data-locked={resultScoreLocked ? "true" : "false"} aria-hidden={resultScoreLocked ? undefined : "true"}>
          {resultScoreLocked ? (
            <>
              {canCreateChallenge ? (
                <section className="daily-share-card challenge-friend-card surface" aria-label="Challenge a friend">
                  <div className="daily-share-card-head">
                    <div>
                      <p className="eyebrow">Spoiler-free challenge</p>
                      <h2>Challenge a friend</h2>
                      <span className="daily-share-mode">{shareSummary.resultLabel}</span>
                    </div>
                    <strong>{shareSummary.score.toLocaleString("en-US")} score to beat</strong>
                  </div>
                  <p className="daily-share-note">
                    Send today&apos;s map set and see who reads the world better. No answers, countries, or source labels are included before play.
                  </p>
                  <dl className="daily-share-metrics" aria-label="Share card stats">
                    <div>
                      <dt>Rank</dt>
                      <dd>{shareSummary.rankTitle}</dd>
                    </div>
                    <div>
                      <dt>Solved</dt>
                      <dd>
                        {shareSummary.solvedCount}/{shareSummary.roundCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Misses</dt>
                      <dd>{shareSummary.missCount}</dd>
                    </div>
                    <div>
                      <dt>Clue spend</dt>
                      <dd>{shareSummary.clueSpend.toLocaleString("en-US")}</dd>
                    </div>
                  </dl>
                  <div className="share-result-strip" aria-label={`${shareSummary.roundCount}-round result strip`}>
                    {shareSummary.rounds.map((tone, index) => (
                      <span key={`${run.rounds[index]?.roundId ?? index}-${tone}`} data-result={tone}>
                        <small>{index + 1}</small>
                      </span>
                    ))}
                  </div>
                  <div className="challenge-friend-actions">
                    <button className="button" type="button" onClick={openChallengeInviteModal}>
                      <Mail size={18} aria-hidden="true" />
                      Challenge a friend
                    </button>
                    <button className="button-secondary" type="button" onClick={() => void shareChallenge()}>
                      <Share2 size={18} aria-hidden="true" />
                      Share challenge
                    </button>
                    <button className="button-secondary" type="button" onClick={() => void copyChallengeLink()}>
                      <Copy size={18} aria-hidden="true" />
                      {resultCopyState === "copied" ? "Copied" : resultCopyState === "failed" ? "Could not copy" : "Copy link"}
                    </button>
                    <a
                      className="button-secondary"
                      href={emailChallengeHref}
                      onClick={() => {
                        trackCanYouGeoEvent("cgy_share_clicked", { method: "mailto", run_mode: run.mode });
                        trackCanYouGeoEvent("cgy_challenge_created", { method: "mailto", run_mode: run.mode });
                      }}
                    >
                      <Mail size={18} aria-hidden="true" />
                      Email
                    </a>
                    <span className="daily-share-copy-status" role="status" aria-live="polite">
                      {resultCopyState === "copied"
                        ? "Challenge link copied."
                        : resultCopyState === "failed"
                          ? "Open the preview to copy manually."
                          : "No spoilers included."}
                    </span>
                  </div>
                  {inviteModalOpen ? (
                    <div className="challenge-email-modal-backdrop" role="presentation">
                      <div className="challenge-email-modal surface" role="dialog" aria-modal="true" aria-labelledby="challenge-email-title">
                        <div className="challenge-email-modal-head">
                          <div>
                            <p className="eyebrow">One-time invite</p>
                            <h3 id="challenge-email-title">Send challenge by email</h3>
                          </div>
                          <button className="button-secondary" type="button" onClick={() => setInviteModalOpen(false)}>
                            Close
                          </button>
                        </div>
                        <p>
                          Send a spoiler-free challenge link from Can You Geo. Your friend is not added to marketing lists, and your email is not exposed.
                        </p>
                        {signedIn ? (
                          <form className="challenge-email-form" onSubmit={(event) => void sendChallengeEmailInvite(event)}>
                            <label>
                              Friend&apos;s email
                              <input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                required
                                value={inviteEmail}
                                onChange={(event) => setInviteEmail(event.target.value)}
                                placeholder="friend@example.com"
                              />
                            </label>
                            <label>
                              Optional short message
                              <textarea
                                maxLength={CHALLENGE_EMAIL_NOTE_MAX_LENGTH}
                                value={inviteMessage}
                                onChange={(event) => setInviteMessage(event.target.value)}
                                placeholder="I think you can beat this."
                              />
                            </label>
                            <p className="challenge-email-note">
                              {CHALLENGE_EMAIL_NOTE_MAX_LENGTH - inviteMessage.length} characters left. Keep it friendly and spoiler-free.
                            </p>
                            <button className="button" type="submit" disabled={invitePending}>
                              {invitePending ? "Sending..." : "Send challenge"}
                            </button>
                          </form>
                        ) : (
                          <div className="challenge-email-signed-out">
                            <p>Guests can share, copy, or use mailto. Sign in to send a one-time Can You Geo email invite.</p>
                            <Link className="button" href="/sign-in">
                              Sign in to send
                            </Link>
                          </div>
                        )}
                        {inviteStatus ? (
                          <p className={inviteSent ? "account-disabled-panel" : "account-error"} role={inviteSent ? "status" : "alert"}>
                            {inviteStatus}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <details className="share-preview-disclosure">
                    <summary>Preview share text</summary>
                    <textarea className="share-text" readOnly value={shareText} aria-label="Spoiler-free share text preview" />
                  </details>
                </section>
              ) : null}
              <div className="summary-next-actions surface" aria-label="Post-run actions">
                {reviewHref ? (
                  <Link className="button" href={reviewHref}>
                    Review result
                  </Link>
                ) : null}
                {isSampleRun ? (
                  <Link className="button" href="/upgrade">
                    Start Pro
                  </Link>
                ) : (
                  <button className="button" type="button" onClick={onPractice}>
                    Play another set
                  </button>
                )}
                {canReplayForPractice ? (
                  <button className="button-secondary" type="button" onClick={onReplay}>
                    {run.mode === "challenge" ? "Replay this challenge" : "Replay for practice"}
                  </button>
                ) : null}
                {!isSampleRun ? (
                  <Link className="button-secondary" href="/past-games">
                    Past Games
                  </Link>
                ) : null}
                <Link className="button-secondary" href={isSampleRun ? "/sign-up" : "/account/stats"}>
                  {isSampleRun ? "Create free account" : "View saved stats"}
                </Link>
              </div>
              <div className="status-live" role="status" aria-live="polite">
                {shareStatus}
              </div>
            </>
          ) : null}
        </div>
        <section className="account-save-card surface" aria-label="Save your progress">
          <div>
            <p className="eyebrow">Save progress</p>
            <h2>{accountSaveHeading}</h2>
            <p>
              {signedIn
                ? isSampleRun
                  ? "Sample runs are not added to account history. Free Daily results and Atlas runs save after sign-in."
                  : isPastRecord
                  ? "This Past Game result is saved locally first, then attached to your account record when sync is available."
                  : "Your result is saved locally first, then attached to your account record when sync is available."
                : isSampleRun
                  ? "Sample Run is not saved. A free account starts fresh Daily progress with stats and streaks."
                  : "Your result is saved in this browser. Free can save completed runs, stats, and streaks to your account; Pro opens the full atlas."}
            </p>
            {cloudSaveStatus ? (
              <p className="status-live" role="status">
                {cloudSaveStatus}
              </p>
            ) : null}
          </div>
          <div className="button-row">
            <Link className="button" href={signedIn && !isSampleRun ? "/account/stats" : "/upgrade"}>
              {signedIn && !isSampleRun ? "View saved stats" : "Start Pro"}
            </Link>
            {signedIn && !isSampleRun ? null : (
              <Link className="button-secondary" href="/sign-up">
                Create free account
              </Link>
            )}
            {!isSampleRun ? (
              <Link className="button-secondary" href="/account">
                View account
              </Link>
            ) : null}
          </div>
        </section>
      </div>
      {isSampleRun ? null : <PlayerStatsPanel store={store} heading={statsHeading} note={saveNote} />}
    </section>
  );
}
