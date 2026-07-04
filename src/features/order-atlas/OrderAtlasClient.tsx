"use client";

import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, ChevronsDown, ChevronsUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { localDateKey } from "@/lib/game/retention";
import { ORDER_ATLAS_CATALOG } from "@/lib/order-atlas/catalog";
import {
  ORDER_ATLAS_MAX_SCORE,
  pointsPerOrderAtlasPlacement,
  scoreOrderAtlasOrder,
  type OrderAtlasScoreBreakdown
} from "@/lib/order-atlas/scoring";
import {
  ORDER_ATLAS_ROUND_COUNT,
  sampleOrderAtlasRoundIds,
  selectOrderAtlasDailyRoundIds,
  selectOrderAtlasPracticeRoundIds
} from "@/lib/order-atlas/selection";
import type { OrderAtlasDifficulty, OrderAtlasEligibility, OrderAtlasOrder } from "@/lib/order-atlas/schemas";
import {
  createOrderAtlasRun,
  defaultOrderAtlasPersistedState,
  loadOrderAtlasPersistedState,
  persistOrderAtlasRun,
  saveOrderAtlasPersistedState,
  type OrderAtlasPersistedState,
  type OrderAtlasRunMode,
  type OrderAtlasRunState
} from "@/lib/order-atlas/storage";

export type OrderAtlasPlayableCountry = {
  iso3: string;
  name: string;
  value: number;
  formattedValue: string;
};

export type OrderAtlasPlayableRound = {
  id: string;
  indicatorId: string;
  category: string;
  difficulty: OrderAtlasDifficulty;
  eligibility: OrderAtlasEligibility;
  prompt: string;
  highlightText: string;
  explanation: string;
  selectedCountries: OrderAtlasPlayableCountry[];
  trueOrder: OrderAtlasPlayableCountry[];
  order: OrderAtlasOrder;
  unit: string;
  year: number;
  dateVintage: string;
  sourceLabel: string;
  sourceUrl: string;
  scopeNote?: string;
};

type OrderAtlasClientProps = {
  rounds: OrderAtlasPlayableRound[];
  todayOverride?: string;
};

type SubmittedRound = {
  roundId: string;
  prompt: string;
  submittedIso3: string[];
  score: OrderAtlasScoreBreakdown;
};

const difficultyLabels: Record<OrderAtlasDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
};

const eligibilityLabels: Record<OrderAtlasEligibility, string> = {
  sample: "Sample Run",
  daily: "Daily",
  practice: "Practice",
  "expert-only": "Expert-only"
};

function runModeLabel(runOrMode: OrderAtlasRunState | OrderAtlasRunMode) {
  const mode = typeof runOrMode === "string" ? runOrMode : runOrMode.mode;
  if (mode === "daily") return "Order Atlas Daily";
  if (mode === "practice") return "Pro Practice Run";
  return "Order Atlas Sample Run";
}

function runSummaryCopy(run: OrderAtlasRunState) {
  if (run.mode === "daily") return "You finished today's Order Atlas Daily. This result stays local to this browser for now.";
  if (run.mode === "practice") return "You finished a Pro Practice Run. This result stays local and does not affect Daily progress.";
  return "You finished the Order Atlas sample.";
}

function runIntroCopy(mode: OrderAtlasRunMode) {
  if (mode === "daily") return "Order Atlas Daily uses three deterministic rounds for today. Progress resumes locally if you reload.";
  if (mode === "practice") return "Pro Practice draws three rounds from the practice catalog and stays separate from Daily progress.";
  return "No account needed. Sample progress stays local, and no account results are saved.";
}

function validStoredRun(
  run: OrderAtlasRunState | null,
  mode: OrderAtlasRunMode,
  contentVersion: string,
  roundById: Map<string, OrderAtlasPlayableRound>,
  dateKey?: string
) {
  if (!run || run.mode !== mode || run.contentVersion !== contentVersion) return null;
  if (dateKey && run.dateKey !== dateKey) return null;
  if (run.roundIds.length !== run.rounds.length) return null;
  for (const [index, roundId] of run.roundIds.entries()) {
    const playableRound = roundById.get(roundId);
    const state = run.rounds[index];
    if (!playableRound || !state) return null;
    const expectedCountries = new Set(playableRound.selectedCountries.map((country) => country.iso3));
    if (state.cardOrderIso3.length !== expectedCountries.size) return null;
    if (state.cardOrderIso3.some((iso3) => !expectedCountries.has(iso3))) return null;
    if (state.submittedIso3?.some((iso3) => !expectedCountries.has(iso3))) return null;
  }
  return run;
}

function submittedRoundFromState(run: OrderAtlasRunState): SubmittedRound | null {
  const state = run.rounds[run.currentRoundIndex];
  const roundId = run.roundIds[run.currentRoundIndex];
  if (!state?.submittedIso3 || !state.score || !roundId) return null;
  return {
    roundId,
    prompt: "",
    submittedIso3: state.submittedIso3,
    score: state.score
  };
}

function scrollToTop() {
  window.requestAnimationFrame(() => window.scrollTo(0, 0));
}

export function OrderAtlasClient({ rounds, todayOverride }: OrderAtlasClientProps) {
  const { entitlement, loading: entitlementLoading, signedIn } = useEntitlement();
  const todayKey = todayOverride ?? localDateKey(new Date());
  const isProAccount = signedIn && entitlement.plan === "pro";
  const isFreeAccount = signedIn && entitlement.plan !== "pro";
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [store, setStore] = useState<OrderAtlasPersistedState>(() => defaultOrderAtlasPersistedState());
  const [run, setRun] = useState<OrderAtlasRunState | null>(null);
  const revealRef = useRef<HTMLElement | null>(null);
  const shouldScrollToRevealRef = useRef(false);

  const roundById = useMemo(() => new Map(rounds.map((round) => [round.id, round])), [rounds]);

  useEffect(() => {
    setStore(loadOrderAtlasPersistedState());
    setStoreLoaded(true);
  }, []);

  useEffect(() => {
    if (!run || !storeLoaded) return;
    setStore((current) => {
      const next = persistOrderAtlasRun(current, run);
      saveOrderAtlasPersistedState(next);
      return next;
    });
  }, [run, storeLoaded]);

  const currentSampleRun = useMemo(
    () => validStoredRun(store.activeSampleRun, "sample", ORDER_ATLAS_CATALOG.contentVersion, roundById),
    [roundById, store.activeSampleRun]
  );
  const currentDailyRun = useMemo(
    () => validStoredRun(store.activeDailyRun, "daily", ORDER_ATLAS_CATALOG.contentVersion, roundById, todayKey),
    [roundById, store.activeDailyRun, todayKey]
  );
  const currentPracticeRun = useMemo(
    () => validStoredRun(store.activePracticeRun, "practice", ORDER_ATLAS_CATALOG.contentVersion, roundById),
    [roundById, store.activePracticeRun]
  );

  const currentRound = run ? roundById.get(run.roundIds[run.currentRoundIndex]) : null;
  const currentRoundState = run?.rounds[run.currentRoundIndex] ?? null;
  const submittedRound = run ? submittedRoundFromState(run) : null;

  useEffect(() => {
    shouldScrollToRevealRef.current = false;
  }, [run?.id, run?.currentRoundIndex]);

  useEffect(() => {
    if (!submittedRound || !shouldScrollToRevealRef.current) return;

    shouldScrollToRevealRef.current = false;
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const revealTarget = revealRef.current;
    if (!revealTarget || typeof revealTarget.scrollIntoView !== "function") return;

    revealTarget.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
  }, [submittedRound]);

  const currentCountriesByIso3 = useMemo(
    () => new Map((currentRound?.selectedCountries ?? []).map((country) => [country.iso3, country])),
    [currentRound]
  );
  const orderedCountries =
    currentRoundState?.cardOrderIso3.map((iso3) => currentCountriesByIso3.get(iso3)).filter((country): country is OrderAtlasPlayableCountry => Boolean(country)) ?? [];
  const totalScore = run?.rounds.reduce((sum, round) => sum + (round.score?.finalScore ?? 0), 0) ?? 0;
  const advanceLabel = run && run.currentRoundIndex + 1 >= run.rounds.length ? "Open results" : "Next round";

  if (rounds.length === 0) {
    return (
      <section className="order-atlas-page game-shell page-shell">
        <div className="empty-state surface">
          <h1>Order Atlas is not ready.</h1>
          <p>The game needs valid rounds before gameplay can start.</p>
        </div>
      </section>
    );
  }

  function startOrderRun(mode: OrderAtlasRunMode, options: { fresh?: boolean } = {}) {
    if (mode === "daily" && !signedIn) return;
    if (mode === "practice" && !isProAccount) return;

    const existing = mode === "sample" ? currentSampleRun : mode === "daily" ? currentDailyRun : currentPracticeRun;
    if (!options.fresh && existing) {
      setRun(existing);
      scrollToTop();
      return;
    }

    const selectedRoundIds =
      mode === "sample"
        ? sampleOrderAtlasRoundIds(rounds)
        : mode === "daily"
          ? selectOrderAtlasDailyRoundIds(rounds, ORDER_ATLAS_CATALOG.contentVersion, todayKey)
          : selectOrderAtlasPracticeRoundIds(rounds, ORDER_ATLAS_CATALOG.contentVersion, `run:${Date.now()}`);
    const selectedPlayableRounds = selectedRoundIds.map((roundId) => roundById.get(roundId)).filter((round): round is OrderAtlasPlayableRound => Boolean(round));
    if (selectedPlayableRounds.length < ORDER_ATLAS_ROUND_COUNT) return;

    const nextRun = createOrderAtlasRun({
      mode,
      dateKey: todayKey,
      contentVersion: ORDER_ATLAS_CATALOG.contentVersion,
      roundIds: selectedPlayableRounds.map((round) => round.id),
      initialCardOrders: selectedPlayableRounds.map((round) => round.selectedCountries.map((country) => country.iso3)),
      salt: mode === "sample" ? "evergreen" : mode === "daily" ? todayKey : `pro:${Date.now()}`
    });
    setRun(nextRun);
    scrollToTop();
  }

  function updateRun(updater: (run: OrderAtlasRunState) => OrderAtlasRunState) {
    setRun((current) => (current ? updater(current) : current));
  }

  function moveCard(index: number, targetIndex: number) {
    if (!run || !currentRoundState || submittedRound || targetIndex < 0 || targetIndex >= currentRoundState.cardOrderIso3.length || index === targetIndex) return;
    updateRun((current) => {
      const roundsState = [...current.rounds];
      const roundState = roundsState[current.currentRoundIndex];
      if (!roundState?.cardOrderIso3) return current;
      const nextOrder = [...roundState.cardOrderIso3];
      const [moved] = nextOrder.splice(index, 1);
      nextOrder.splice(targetIndex, 0, moved);
      roundsState[current.currentRoundIndex] = { ...roundState, cardOrderIso3: nextOrder };
      return { ...current, rounds: roundsState };
    });
  }

  function submitRound() {
    if (!run || !currentRound || !currentRoundState || submittedRound) return;
    const score = scoreOrderAtlasOrder({
      submittedIso3: currentRoundState.cardOrderIso3,
      trueOrderIso3: currentRound.trueOrder.map((country) => country.iso3)
    });
    shouldScrollToRevealRef.current = true;
    updateRun((current) => {
      const roundsState = [...current.rounds];
      const roundState = roundsState[current.currentRoundIndex];
      if (!roundState) return current;
      roundsState[current.currentRoundIndex] = {
        ...roundState,
        submittedIso3: roundState.cardOrderIso3,
        score
      };
      return { ...current, rounds: roundsState };
    });
  }

  function nextRound() {
    if (!run || !submittedRound) return;
    if (run.currentRoundIndex + 1 >= run.rounds.length) {
      setRun({ ...run, status: "complete" });
      return;
    }
    setRun({ ...run, currentRoundIndex: run.currentRoundIndex + 1 });
    scrollToTop();
  }

  function restartRun(sourceRun: OrderAtlasRunState) {
    startOrderRun(sourceRun.mode, { fresh: true });
  }

  if (!run) {
    return (
      <OrderAtlasLobby
        entitlementLoading={entitlementLoading}
        signedIn={signedIn}
        isFreeAccount={isFreeAccount}
        isProAccount={isProAccount}
        todayKey={todayKey}
        currentSampleRun={currentSampleRun}
        currentDailyRun={currentDailyRun}
        currentPracticeRun={currentPracticeRun}
        onStart={startOrderRun}
      />
    );
  }

  if (run.status === "complete") {
    return (
      <OrderAtlasSummary
        run={run}
        signedIn={signedIn}
        isFreeAccount={isFreeAccount}
        isProAccount={isProAccount}
        onRestart={() => restartRun(run)}
        onLobby={() => setRun(null)}
      />
    );
  }

  if (!currentRound || !currentRoundState) {
    return (
      <section className="order-atlas-page game-shell page-shell">
        <div className="empty-state surface">
          <h1>Order Atlas run is unavailable.</h1>
          <p>This saved Order Atlas run references a round that is no longer in the catalog.</p>
          <button className="button" type="button" onClick={() => setRun(null)}>
            Choose another run
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="order-atlas-page game-shell page-shell">
      <aside className="order-atlas-sidebar surface" aria-label="Order Atlas round status">
        <p className="eyebrow">{runModeLabel(run)}</p>
        <h1>Order the countries.</h1>
        <p>{runIntroCopy(run.mode)}</p>
        <div className="order-atlas-score-card">
          <span>Round</span>
          <strong>
            {run.currentRoundIndex + 1}/{run.rounds.length}
          </strong>
        </div>
        <div className="order-atlas-score-card">
          <span>Current score</span>
          <strong>{submittedRound ? submittedRound.score.finalScore.toLocaleString() : ORDER_ATLAS_MAX_SCORE.toLocaleString()}</strong>
        </div>
        <div className="order-atlas-score-card">
          <span>Saved total</span>
          <strong>{totalScore.toLocaleString()}</strong>
        </div>
        <div className="order-atlas-context-card">
          <span>{runModeLabel(run)}</span>
          <span>{eligibilityLabels[currentRound.eligibility]}</span>
          <span>{difficultyLabels[currentRound.difficulty]}</span>
          <span>{currentRound.category}</span>
          <span>
            {currentRound.selectedCountries.length} cards -&gt; {formatPlacementPoints(currentRound.selectedCountries.length)} points each
          </span>
        </div>
      </aside>

      <main className="order-atlas-main">
        <section className="order-atlas-prompt-card surface">
          <p className="eyebrow">Challenge</p>
          <h2>{renderChallengePrompt(currentRound)}</h2>
          <p>
            Values stay hidden until you submit. Sort {currentRound.order === "asc" ? "lowest to highest" : "highest to lowest"}.
          </p>
        </section>

        <section className="order-atlas-order-card surface" aria-labelledby="order-atlas-order-heading">
          <div className="order-atlas-section-head">
            <div>
              <p className="eyebrow">Your order</p>
              <h2 id="order-atlas-order-heading">Move the cards into order.</h2>
            </div>
            {submittedRound ? (
              <button type="button" className="button" onClick={nextRound}>
                <ArrowRight aria-hidden="true" />
                {advanceLabel}
              </button>
            ) : (
              <button type="button" className="button" onClick={submitRound}>
                <CheckCircle2 aria-hidden="true" />
                Submit order
              </button>
            )}
          </div>

          <ol className="order-atlas-card-list" aria-label="Player country order">
            {orderedCountries.map((country, index) => (
              <li key={country.iso3} className={submittedRound ? "is-submitted" : ""}>
                <span className="order-atlas-rank">{index + 1}</span>
                <div>
                  <h3>{country.name}</h3>
                  <p>
                    <code>{country.iso3}</code>
                    <span>{submittedRound ? country.formattedValue : "Value hidden"}</span>
                  </p>
                </div>
                <div className="order-atlas-card-actions" aria-label={`Move ${country.name}`}>
                  <button type="button" onClick={() => moveCard(index, 0)} disabled={Boolean(submittedRound) || index === 0} aria-label={`Move ${country.name} to top`}>
                    <ChevronsUp aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveCard(index, index - 1)} disabled={Boolean(submittedRound) || index === 0} aria-label={`Move ${country.name} up`}>
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(index, index + 1)}
                    disabled={Boolean(submittedRound) || index === orderedCountries.length - 1}
                    aria-label={`Move ${country.name} down`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(index, orderedCountries.length - 1)}
                    disabled={Boolean(submittedRound) || index === orderedCountries.length - 1}
                    aria-label={`Move ${country.name} to bottom`}
                  >
                    <ChevronsDown aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {submittedRound ? (
          <section ref={revealRef} className="order-atlas-reveal surface" aria-labelledby="order-atlas-reveal-heading">
            <div className="order-atlas-section-head">
              <div>
                <p className="eyebrow">Reveal</p>
                <h2 id="order-atlas-reveal-heading">{submittedRound.score.finalScore.toLocaleString()} points</h2>
                <p>
                  {submittedRound.score.correctPositions} of {submittedRound.score.totalCountries} countries placed correctly.
                </p>
                <p>
                  Each country in the exact right spot earns points. {currentRound.selectedCountries.length} cards -&gt;{" "}
                  {formatPlacementPoints(currentRound.selectedCountries.length)} points per correct placement.
                </p>
              </div>
              <button type="button" className="button" onClick={nextRound}>
                {advanceLabel}
              </button>
            </div>

            <div className="order-atlas-reveal-grid">
              <article>
                <h3>True order and values</h3>
                <ol className="order-atlas-true-order">
                  {currentRound.trueOrder.map((country, index) => (
                    <li key={country.iso3}>
                      <span>{index + 1}</span>
                      <strong>{country.name}</strong>
                      <code>{country.iso3}</code>
                      <b>{country.formattedValue}</b>
                    </li>
                  ))}
                </ol>
              </article>
              <article>
                <h3>Your submitted order</h3>
                <ol className="order-atlas-submitted-order">
                  {submittedRound.submittedIso3.map((iso3, index) => {
                    const country = currentCountriesByIso3.get(iso3);
                    const isCorrectPlacement = currentRound.trueOrder[index]?.iso3 === iso3;
                    return (
                      <li key={iso3} className={isCorrectPlacement ? "is-correct-placement" : "is-misplaced"}>
                        <span>{index + 1}</span>
                        <strong>{country?.name ?? iso3}</strong>
                        <small>{isCorrectPlacement ? "Correctly placed" : "Misplaced"}</small>
                        <b>{country?.formattedValue ?? "missing"}</b>
                      </li>
                    );
                  })}
                </ol>
              </article>
            </div>

            <div className="order-atlas-source-grid">
              <span>
                <strong>Unit</strong>
                {currentRound.unit}
              </span>
              <span>
                <strong>Year / vintage</strong>
                {currentRound.dateVintage}
              </span>
              <span>
                <strong>Source</strong>
                <a href={currentRound.sourceUrl}>{currentRound.sourceLabel}</a>
              </span>
              <span>
                <strong>Indicator</strong>
                {currentRound.indicatorId}
              </span>
            </div>

            <div className="order-atlas-explanation">
              <h3>Why this order makes sense</h3>
              <p>{currentRound.explanation}</p>
              {currentRound.scopeNote ? <p>{currentRound.scopeNote}</p> : null}
            </div>
          </section>
        ) : null}
      </main>
    </section>
  );
}

function OrderAtlasLobby({
  entitlementLoading,
  signedIn,
  isFreeAccount,
  isProAccount,
  todayKey,
  currentSampleRun,
  currentDailyRun,
  currentPracticeRun,
  onStart
}: {
  entitlementLoading: boolean;
  signedIn: boolean;
  isFreeAccount: boolean;
  isProAccount: boolean;
  todayKey: string;
  currentSampleRun: OrderAtlasRunState | null;
  currentDailyRun: OrderAtlasRunState | null;
  currentPracticeRun: OrderAtlasRunState | null;
  onStart: (mode: OrderAtlasRunMode, options?: { fresh?: boolean }) => void;
}) {
  const sampleActionLabel = currentSampleRun?.status === "complete" ? "View Sample Run" : currentSampleRun ? "Resume Sample Run" : "Start sample run";
  const dailyActionLabel = currentDailyRun?.status === "complete" ? "View Order Atlas Daily" : currentDailyRun ? "Resume Order Atlas Daily" : "Start Order Atlas Daily";
  const practiceActionLabel =
    currentPracticeRun?.status === "complete" ? "View Practice Result" : currentPracticeRun ? "Resume Practice Run" : "Start Practice Run";

  return (
    <section className="game-entry page-shell">
      <div className="entry-copy">
        <p className="eyebrow">Order Atlas</p>
        <h1 className="page-title">Order countries by the signal.</h1>
        <p className="lead">
          Arrange country cards by a known geography indicator, then reveal the real values. Order Atlas progress is local to this browser and separate from
          Mystery Map and Pattern Atlas.
        </p>
        <div className="entry-facts" aria-label="Order Atlas facts">
          <span>{ORDER_ATLAS_ROUND_COUNT} rounds per run</span>
          <span>Exact placement scoring</span>
          <span>{entitlementLoading ? "Checking account" : signedIn ? "Account-aware" : "No account needed"}</span>
        </div>
      </div>
      <div className="entry-panel surface" aria-label="Order Atlas modes">
        <div className="mode-panel-heading lobby-heading">
          <p className="setup-kicker">Choose your game mode</p>
          <h2>Ready to order the atlas?</h2>
          <p>
            {isProAccount
              ? "Play today's Daily or start a Pro Practice Run from the broader Order Atlas catalog."
              : isFreeAccount
                ? "Your free account gets today's Order Atlas Daily with local browser progress."
                : "Try the fixed Order Atlas Sample Run. No account needed and no account results saved."}
          </p>
        </div>
        {!signedIn ? (
          <article className="lobby-primary-card" data-state="ready" aria-label="Order Atlas Sample Run">
            <div className="lobby-primary-copy">
              <p className="setup-kicker">Sample Run</p>
              <h3>Order Atlas Sample Run</h3>
              <p>No account needed. These three starter ordering challenges stay fixed, and no account results are saved.</p>
              <span className="mode-state-pill">Sample run / no account needed</span>
            </div>
            <p className="mode-card-note">Use the sample to learn the ordering and reveal rhythm before signing in.</p>
            <div className="lobby-primary-actions">
              <button className="button lobby-play-button" type="button" onClick={() => onStart("sample")}>
                <span className="lobby-play-main">PLAY</span>
                <small>{sampleActionLabel}</small>
              </button>
              <Link className="button-secondary" href="/sign-up">
                Create free account
              </Link>
              <Link className="button-secondary" href="/upgrade">
                Start Pro
              </Link>
            </div>
          </article>
        ) : (
          <article className="lobby-primary-card" data-state={currentDailyRun?.status === "complete" ? "complete" : "ready"} aria-label="Order Atlas Free Daily">
            <div className="lobby-primary-copy">
              <p className="setup-kicker">Free Daily</p>
              <h3>Order Atlas Daily</h3>
              <p>Three deterministic ordering rounds for {todayKey}. Local progress resumes safely if you reload.</p>
              <span className="mode-state-pill">{currentDailyRun?.status === "active" ? "Daily in progress" : "Free Daily"}</span>
            </div>
            <p className="mode-card-note">Order Atlas Daily is separate from Mystery Map and Pattern Atlas progress.</p>
            <div className="lobby-primary-actions">
              <button className="button lobby-play-button" type="button" onClick={() => onStart("daily")}>
                <span className="lobby-play-main">PLAY</span>
                <small>{dailyActionLabel}</small>
              </button>
              {!isProAccount ? (
                <Link className="button-secondary" href="/upgrade">
                  Go Pro for Practice Runs
                </Link>
              ) : null}
            </div>
          </article>
        )}
        {isProAccount ? (
          <section className="lobby-secondary" aria-label="Pro Order Atlas options">
            <div className="mode-panel-heading mode-panel-heading-secondary">
              <p className="setup-kicker">Pro option</p>
              <h2>Start a Practice Run.</h2>
              <p>Practice draws three ordering rounds from the approved practice catalog. No archives, sharing, leaderboards, or cloud results are added here.</p>
            </div>
            <div className="mode-card-grid mode-card-grid-secondary">
              <article className="mode-card mode-card-practice" aria-label="Pro Order Atlas Practice Run">
                <p className="setup-kicker">Pro Practice Run</p>
                <h3>Practice ordering signals</h3>
                <p>Draw three practice-eligible Order Atlas rounds and keep the result local to this browser.</p>
                <p className="mode-card-note">
                  {currentPracticeRun?.status === "active"
                    ? "A Practice Run is in progress."
                    : currentPracticeRun?.status === "complete"
                      ? "A completed Practice Run is available to review."
                      : "Ready for a fresh Practice Run."}
                </p>
                <div className="mode-card-actions">
                  <button className="button" type="button" onClick={() => onStart("practice")}>
                    {practiceActionLabel}
                  </button>
                  {currentPracticeRun ? (
                    <button className="button-secondary" type="button" onClick={() => onStart("practice", { fresh: true })}>
                      Start new Practice Run
                    </button>
                  ) : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function OrderAtlasSummary({
  run,
  signedIn,
  isFreeAccount,
  isProAccount,
  onRestart,
  onLobby
}: {
  run: OrderAtlasRunState;
  signedIn: boolean;
  isFreeAccount: boolean;
  isProAccount: boolean;
  onRestart: () => void;
  onLobby: () => void;
}) {
  const totalScore = run.rounds.reduce((sum, round) => sum + (round.score?.finalScore ?? 0), 0);
  const canReplayCurrentMode = run.mode === "sample" || run.mode === "practice";

  return (
    <section className="order-atlas-page game-shell page-shell">
      <div className="order-atlas-results surface">
        <div className="order-atlas-results-primary">
          <p className="eyebrow">{runModeLabel(run)} complete</p>
          <h1>{totalScore.toLocaleString()} points</h1>
          <p>{runSummaryCopy(run)}</p>
          <div className="order-atlas-result-grid" aria-label="Per-round scores">
            {run.rounds.map((result, index) => (
              <article key={run.roundIds[index]}>
                <span>Round {index + 1}</span>
                <strong>{(result.score?.finalScore ?? 0).toLocaleString()}</strong>
                <small>
                  {result.score?.correctPositions ?? 0}/{result.score?.totalCountries ?? result.cardOrderIso3.length} placed correctly
                </small>
              </article>
            ))}
          </div>
        </div>
        <div className="order-atlas-results-cta">
          <p className="eyebrow">{run.mode === "practice" ? "Practice complete" : "Next step"}</p>
          <h2>{summaryCtaHeading(run, signedIn, isFreeAccount, isProAccount)}</h2>
          <p>{summaryCtaBody(run, signedIn, isFreeAccount, isProAccount)}</p>
          <div className="order-atlas-results-actions">
            {!signedIn ? (
              <Link className="button" href="/sign-up/">
                Sign up free
              </Link>
            ) : null}
            {isFreeAccount ? (
              <Link className="button" href="/upgrade/">
                Start Pro
              </Link>
            ) : null}
            <button type="button" className="button button-secondary" onClick={onLobby}>
              Choose mode
            </button>
            {canReplayCurrentMode ? (
              <button type="button" className="button button-secondary" onClick={onRestart}>
                <RotateCcw aria-hidden="true" />
                {run.mode === "practice" ? "Start another Practice Run" : "Play sample again"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function summaryCtaHeading(run: OrderAtlasRunState, signedIn: boolean, isFreeAccount: boolean, isProAccount: boolean) {
  if (!signedIn) return "Ready for fresh games every day?";
  if (isFreeAccount) return "Want more Order Atlas practice?";
  if (isProAccount && run.mode !== "practice") return "Keep practicing with Pro.";
  return "Run another ordering set.";
}

function summaryCtaBody(run: OrderAtlasRunState, signedIn: boolean, isFreeAccount: boolean, isProAccount: boolean) {
  if (!signedIn) {
    return "Create a free account to play Order Atlas Daily. Pro adds Order Atlas Practice Runs and supported advanced modes across the Can You Geo library.";
  }
  if (isFreeAccount) {
    return "Your Daily is complete for today. Pro adds repeatable Order Atlas Practice Runs plus supported advanced modes in Mystery Map and Pattern Atlas.";
  }
  if (isProAccount && run.mode !== "practice") {
    return "Start a Pro Practice Run whenever you want a fresh set of Order Atlas ordering challenges.";
  }
  return "Practice results stay local to this browser and do not change Daily progress.";
}

function formatPlacementPoints(countryCount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(pointsPerOrderAtlasPlacement(countryCount));
}

function renderChallengePrompt(round: OrderAtlasPlayableRound) {
  const highlightStart = round.prompt.indexOf(round.highlightText);
  if (highlightStart === -1) return round.prompt;

  const before = round.prompt.slice(0, highlightStart);
  const after = round.prompt.slice(highlightStart + round.highlightText.length);

  return (
    <>
      {before}
      <span className="order-atlas-challenge-highlight">{round.highlightText}</span>
      {after}
    </>
  );
}
