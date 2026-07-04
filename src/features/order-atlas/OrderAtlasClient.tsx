"use client";

import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, ChevronsDown, ChevronsUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ORDER_ATLAS_MAX_SCORE,
  pointsPerOrderAtlasPlacement,
  scoreOrderAtlasOrder,
  type OrderAtlasScoreBreakdown
} from "@/lib/order-atlas/scoring";
import type { OrderAtlasDifficulty, OrderAtlasEligibility, OrderAtlasOrder } from "@/lib/order-atlas/schemas";

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

export function OrderAtlasClient({ rounds }: OrderAtlasClientProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [cardOrder, setCardOrder] = useState<string[]>(() => rounds[0]?.selectedCountries.map((country) => country.iso3) ?? []);
  const [submittedRound, setSubmittedRound] = useState<SubmittedRound | null>(null);
  const [completedRounds, setCompletedRounds] = useState<SubmittedRound[]>([]);
  const [runComplete, setRunComplete] = useState(false);
  const revealRef = useRef<HTMLElement | null>(null);
  const shouldScrollToRevealRef = useRef(false);

  const currentRound = rounds[roundIndex];

  useEffect(() => {
    if (!currentRound) return;
    shouldScrollToRevealRef.current = false;
    setCardOrder(currentRound.selectedCountries.map((country) => country.iso3));
    setSubmittedRound(null);
  }, [currentRound]);

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
  const orderedCountries = cardOrder.map((iso3) => currentCountriesByIso3.get(iso3)).filter((country): country is OrderAtlasPlayableCountry => Boolean(country));
  const totalScore = completedRounds.reduce((sum, result) => sum + result.score.finalScore, 0);
  const advanceLabel = roundIndex + 1 >= rounds.length ? "Open results" : "Next round";

  if (rounds.length === 0 || !currentRound) {
    return (
      <section className="order-atlas-page game-shell page-shell">
        <div className="empty-state surface">
          <h1>Order Atlas is not ready.</h1>
          <p>The sample run needs valid rounds before gameplay can start.</p>
        </div>
      </section>
    );
  }

  if (runComplete) {
    return (
      <section className="order-atlas-page game-shell page-shell">
        <div className="order-atlas-results surface">
          <div className="order-atlas-results-primary">
            <p className="eyebrow">Sample complete</p>
            <h1>{totalScore.toLocaleString()} points</h1>
            <p>You finished the Order Atlas sample.</p>
            <div className="order-atlas-result-grid" aria-label="Per-round scores">
              {completedRounds.map((result, index) => (
                <article key={result.roundId}>
                  <span>Round {index + 1}</span>
                  <strong>{result.score.finalScore.toLocaleString()}</strong>
                  <small>
                    {result.score.correctPositions}/{result.score.totalCountries} placed correctly
                  </small>
                </article>
              ))}
            </div>
          </div>
          <div className="order-atlas-results-cta">
            <p className="eyebrow">Sample complete</p>
            <h2>Ready for fresh games every day?</h2>
            <p>
              Create a free account to play daily geography challenges and save your progress. Go Pro to unlock supported advanced
              modes like Mystery Map Custom Atlas and Pattern Atlas Pattern Runs. More Order Atlas modes are coming next.
            </p>
            <div className="order-atlas-results-actions">
              <Link className="button" href="/sign-up/">
                Sign up free
              </Link>
              <Link className="button button-secondary" href="/upgrade/">
                Start Pro
              </Link>
              <button type="button" className="button button-secondary" onClick={restartRun}>
                <RotateCcw aria-hidden="true" />
                Play sample again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function moveCard(index: number, targetIndex: number) {
    if (submittedRound || targetIndex < 0 || targetIndex >= cardOrder.length || index === targetIndex) return;
    setCardOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function submitRound() {
    if (submittedRound) return;
    const score = scoreOrderAtlasOrder({
      submittedIso3: cardOrder,
      trueOrderIso3: currentRound.trueOrder.map((country) => country.iso3)
    });
    const result = {
      roundId: currentRound.id,
      prompt: currentRound.prompt,
      submittedIso3: cardOrder,
      score
    };
    shouldScrollToRevealRef.current = true;
    setSubmittedRound(result);
    setCompletedRounds((current) => [...current, result]);
  }

  function nextRound() {
    if (!submittedRound) return;
    if (roundIndex + 1 >= rounds.length) {
      setRunComplete(true);
      return;
    }
    setRoundIndex((current) => current + 1);
  }

  function restartRun() {
    setRoundIndex(0);
    setCardOrder(rounds[0].selectedCountries.map((country) => country.iso3));
    setSubmittedRound(null);
    setCompletedRounds([]);
    setRunComplete(false);
  }

  return (
    <section className="order-atlas-page game-shell page-shell">
      <aside className="order-atlas-sidebar surface" aria-label="Order Atlas round status">
        <p className="eyebrow">Order Atlas sample</p>
        <h1>Order the countries.</h1>
        <p>Arrange the cards by the stated indicator, then submit to reveal the true order and values.</p>
        <div className="order-atlas-score-card">
          <span>Round</span>
          <strong>
            {roundIndex + 1}/{rounds.length}
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
