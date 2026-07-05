"use client";

import { Compass, Lightbulb, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WorldMap } from "@/components/WorldMap";
import { useEntitlement } from "@/features/account/useEntitlement";
import { getPatternAtlasSampleRules } from "@/features/pattern-atlas/sampleRun";
import { loadEntityRegistry, loadManifest, loadMap } from "@/lib/content/loaders";
import type { Entity, MapFeatureCollection } from "@/lib/content/schemas";
import { localDateKey } from "@/lib/game/retention";
import { countryNameByIso3 } from "@/lib/geo/format";
import { PATTERN_ATLAS_CATALOG, PATTERN_ATLAS_RULES } from "@/lib/pattern-atlas/catalog";
import {
  PATTERN_ATLAS_RUN_RULE_COUNT,
  practiceEligiblePatternAtlasRules,
  selectPatternAtlasDailyRuleIds,
  selectPatternAtlasPracticeRuleIds,
  type PatternAtlasRuleFilters
} from "@/lib/pattern-atlas/selection";
import type {
  PatternAtlasDecoy,
  PatternAtlasDifficulty,
  PatternAtlasFamily,
  PatternAtlasRule,
  PatternAtlasSource
} from "@/lib/pattern-atlas/schemas";
import {
  PATTERN_ATLAS_CLUE_PENALTY,
  PATTERN_ATLAS_STARTING_SCORE,
  PATTERN_ATLAS_WRONG_ANSWER_PENALTY,
  createPatternAtlasRun,
  defaultPatternAtlasPersistedState,
  loadPatternAtlasPersistedState,
  persistPatternAtlasRun,
  savePatternAtlasPersistedState,
  type PatternAtlasPersistedState,
  type PatternAtlasRoundState,
  type PatternAtlasRunMode,
  type PatternAtlasRunSetup,
  type PatternAtlasRunState
} from "@/lib/pattern-atlas/storage";

const SAMPLE_RULES = getPatternAtlasSampleRules();
const FAMILY_ORDER: PatternAtlasFamily[] = ["language", "borders", "physical_geography", "organizations", "economy", "indicators"];
const DIFFICULTY_ORDER: PatternAtlasDifficulty[] = ["intro", "standard", "expert"];
const DIFFICULTY_LABELS: Record<PatternAtlasDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
};
const FAMILY_LABELS: Record<PatternAtlasFamily, string> = {
  language: "Language",
  borders: "Borders",
  physical_geography: "Physical Geography",
  organizations: "Organizations",
  economy: "Economy",
  indicators: "Data & statistics"
};
const CLUE_FEEDBACK_LABELS: Record<keyof PatternAtlasRoundState["clues"], string> = {
  family: "Category clue used",
  highlightedCountry: "Country clue used",
  counterexample: "Counterexample clue used"
};

export type PatternAtlasLoadedData = {
  map: MapFeatureCollection;
  entities: Entity[];
  countryNames: Map<string, string>;
};

type AnswerChoice = {
  id: string;
  label: string;
  correct: boolean;
  decoy?: PatternAtlasDecoy;
};

type PatternAtlasClientProps = {
  initialData?: PatternAtlasLoadedData;
  todayOverride?: string;
};

function answerChoicesForRule(rule: PatternAtlasRule, roundIndex: number): AnswerChoice[] {
  const choices: AnswerChoice[] = [
    { id: `${rule.id}:correct`, label: rule.displayAnswer, correct: true },
    ...rule.decoys.map((decoy, index) => ({
      id: `${rule.id}:decoy:${index}`,
      label: decoy.displayAnswer,
      correct: false,
      decoy
    }))
  ];
  const offset = (roundIndex + 1) % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}

function familyLabel(family: PatternAtlasFamily) {
  return FAMILY_LABELS[family];
}

function difficultyLabel(difficulty: PatternAtlasDifficulty) {
  return DIFFICULTY_LABELS[difficulty];
}

function sourceLabel(source: PatternAtlasSource) {
  return `${source.provider}: ${source.dataset}`;
}

function countryName(iso3: string, countryNames: Map<string, string>) {
  return countryNames.get(iso3) ?? iso3;
}

function countryRows(iso3Values: string[], countryNames: Map<string, string>) {
  return iso3Values
    .map((iso3) => ({ iso3, name: countryName(iso3, countryNames) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function mappedScopeNote(rule: PatternAtlasRule) {
  if (rule.scopeNote) return rule.scopeNote;
  if (rule.displayAnswer.toLowerCase().includes("mapped")) {
    return "This answer is scoped to countries represented in the current Can You Geo map.";
  }
  return null;
}

function runModeLabel(runOrMode: PatternAtlasRunState | PatternAtlasRunMode) {
  const mode = typeof runOrMode === "string" ? runOrMode : runOrMode.mode;
  if (mode === "daily") return "Pattern Atlas Daily";
  if (mode === "practice") return "Pro Pattern Run";
  return "Pattern Atlas Sample Run";
}

function runContextChips(run: PatternAtlasRunState) {
  if (run.mode === "practice") {
    return [
      runModeLabel(run),
      run.setup?.family ? familyLabel(run.setup.family) : "All Families",
      run.setup?.difficulty ? difficultyLabel(run.setup.difficulty) : "All Difficulties"
    ];
  }
  if (run.mode === "daily") return ["Free Daily"];
  return ["Sample Run"];
}

function runSummaryCopy(run: PatternAtlasRunState) {
  if (run.mode === "daily") return "Your Pattern Atlas Daily progress is saved locally and isolated from Mystery Map.";
  if (run.mode === "practice") return "This Pro Pattern Run is saved locally as Pattern Atlas progress only.";
  return "Sample Run progress stays local. No account or profile stats are saved.";
}

function validStoredRun(
  run: PatternAtlasRunState | null,
  mode: PatternAtlasRunMode,
  contentVersion: string,
  ruleById: Map<string, PatternAtlasRule>,
  dateKey?: string
) {
  if (!run || run.mode !== mode || run.contentVersion !== contentVersion) return null;
  if (dateKey && run.dateKey !== dateKey) return null;
  if (run.ruleIds.length !== run.rounds.length) return null;
  if (run.ruleIds.some((ruleId) => !ruleById.has(ruleId))) return null;
  return run;
}

function updateCurrentRound(run: PatternAtlasRunState, updater: (round: PatternAtlasRoundState) => PatternAtlasRoundState): PatternAtlasRunState {
  if (run.status === "complete") return run;
  const currentRound = run.rounds[run.currentRoundIndex];
  if (!currentRound) return run;
  const rounds = [...run.rounds];
  rounds[run.currentRoundIndex] = updater(currentRound);
  return { ...run, rounds };
}

function scrollToTop() {
  window.requestAnimationFrame(() => window.scrollTo(0, 0));
}

export function PatternAtlasClient({ initialData, todayOverride }: PatternAtlasClientProps) {
  const { entitlement, loading: entitlementLoading, signedIn } = useEntitlement();
  const todayKey = todayOverride ?? localDateKey(new Date());
  const isProAccount = signedIn && entitlement.plan === "pro";
  const isFreeAccount = signedIn && entitlement.plan !== "pro";
  const [data, setData] = useState<PatternAtlasLoadedData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [store, setStore] = useState<PatternAtlasPersistedState>(() => defaultPatternAtlasPersistedState());
  const [run, setRun] = useState<PatternAtlasRunState | null>(null);
  const [practiceFamily, setPracticeFamily] = useState<PatternAtlasFamily | "">("");
  const [practiceDifficulty, setPracticeDifficulty] = useState<PatternAtlasDifficulty | "">("");
  const sourceById = useMemo(() => new Map(PATTERN_ATLAS_CATALOG.sourceRegistry.map((source) => [source.id, source])), []);
  const ruleById = useMemo(() => new Map(PATTERN_ATLAS_RULES.map((rule) => [rule.id, rule])), []);

  useEffect(() => {
    setStore(loadPatternAtlasPersistedState());
    setStoreLoaded(true);
  }, []);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    async function loadPatternAtlasData() {
      const manifest = await loadManifest();
      const [map, registry] = await Promise.all([loadMap(manifest.map.path), loadEntityRegistry(manifest.entityRegistry.path)]);
      if (cancelled) return;
      setData({
        map,
        entities: registry.entities,
        countryNames: countryNameByIso3(registry.entities)
      });
    }
    loadPatternAtlasData().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Could not load Pattern Atlas data"));
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  useEffect(() => {
    if (!run || !storeLoaded) return;
    setStore((current) => {
      const next = persistPatternAtlasRun(current, run);
      savePatternAtlasPersistedState(next);
      return next;
    });
  }, [run, storeLoaded]);

  const currentSampleRun = useMemo(
    () => validStoredRun(store.activeSampleRun, "sample", PATTERN_ATLAS_CATALOG.contentVersion, ruleById),
    [ruleById, store.activeSampleRun]
  );
  const currentDailyRun = useMemo(
    () => validStoredRun(store.activeDailyRun, "daily", PATTERN_ATLAS_CATALOG.contentVersion, ruleById, todayKey),
    [ruleById, store.activeDailyRun, todayKey]
  );
  const currentPracticeRun = useMemo(
    () => validStoredRun(store.activePracticeRun, "practice", PATTERN_ATLAS_CATALOG.contentVersion, ruleById),
    [ruleById, store.activePracticeRun]
  );

  const practiceFilters = useMemo<PatternAtlasRuleFilters>(
    () => ({
      ...(practiceFamily ? { family: practiceFamily } : {}),
      ...(practiceDifficulty ? { difficulty: practiceDifficulty } : {})
    }),
    [practiceDifficulty, practiceFamily]
  );
  const practiceMatches = useMemo(() => practiceEligiblePatternAtlasRules(PATTERN_ATLAS_RULES, practiceFilters), [practiceFilters]);
  const hasFullPracticeRun = practiceMatches.length >= PATTERN_ATLAS_RUN_RULE_COUNT;
  const familyOptions = useMemo(
    () =>
      FAMILY_ORDER.map((family) => ({
        family,
        count: practiceEligiblePatternAtlasRules(PATTERN_ATLAS_RULES, { ...practiceFilters, family }).length
      })).filter((option) => option.count > 0),
    [practiceFilters]
  );
  const difficultyOptions = useMemo(
    () =>
      DIFFICULTY_ORDER.map((difficulty) => ({
        difficulty,
        count: practiceEligiblePatternAtlasRules(PATTERN_ATLAS_RULES, { ...practiceFilters, difficulty }).length
      })).filter((option) => option.count > 0),
    [practiceFilters]
  );

  function startPatternRun(mode: PatternAtlasRunMode, options: { fresh?: boolean; setup?: PatternAtlasRunSetup } = {}) {
    if (mode === "daily" && !signedIn) return;
    if (mode === "practice" && !isProAccount) return;

    const existing = mode === "sample" ? currentSampleRun : mode === "daily" ? currentDailyRun : currentPracticeRun;
    const canResumeExisting = mode === "sample" ? existing?.status === "active" : Boolean(existing);
    if (!options.fresh && existing && canResumeExisting) {
      setRun(existing);
      scrollToTop();
      return;
    }

    const setup = mode === "practice" ? options.setup ?? practiceSetupFromFilters(practiceFilters) : undefined;
    const selectedRuleIds =
      mode === "sample"
        ? SAMPLE_RULES.map((rule) => rule.id)
        : mode === "daily"
          ? selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, todayKey)
          : selectPatternAtlasPracticeRuleIds(
              PATTERN_ATLAS_RULES,
              PATTERN_ATLAS_CATALOG.contentVersion,
              `run:${Date.now()}`,
              setup ? { family: setup.family, difficulty: setup.difficulty } : practiceFilters
            );
    if (selectedRuleIds.length === 0) return;
    if (mode === "practice" && selectedRuleIds.length < PATTERN_ATLAS_RUN_RULE_COUNT) return;

    const nextRun = createPatternAtlasRun({
      mode,
      dateKey: todayKey,
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: selectedRuleIds,
      salt: mode === "sample" ? "evergreen" : mode === "daily" ? todayKey : `pro:${Date.now()}`,
      ...(setup ? { setup } : {})
    });
    setRun(nextRun);
    scrollToTop();
  }

  function revealClue(clue: keyof PatternAtlasRoundState["clues"]) {
    setRun((current) => {
      if (!current) return current;
      return updateCurrentRound(current, (round) => {
        if (round.solved || round.clues[clue]) return round;
        return {
          ...round,
          score: round.score - PATTERN_ATLAS_CLUE_PENALTY,
          feedback: `${CLUE_FEEDBACK_LABELS[clue]}. -${PATTERN_ATLAS_CLUE_PENALTY} points.`,
          clues: { ...round.clues, [clue]: true }
        };
      });
    });
  }

  function submitAnswer(choice: AnswerChoice, rule: PatternAtlasRule) {
    setRun((current) => {
      if (!current) return current;
      return updateCurrentRound(current, (round) => {
        if (round.solved || round.rejectedAnswerIds.includes(choice.id)) return round;
        if (choice.correct) {
          return {
            ...round,
            solved: true,
            feedback: `Correct. ${rule.displayAnswer}.`
          };
        }
        return {
          ...round,
          score: round.score - PATTERN_ATLAS_WRONG_ANSWER_PENALTY,
          rejectedAnswerIds: [...round.rejectedAnswerIds, choice.id],
          feedback: `${choice.label} is not the pattern. -${PATTERN_ATLAS_WRONG_ANSWER_PENALTY} points.`
        };
      });
    });
  }

  function nextRound() {
    setRun((current) => {
      if (!current) return current;
      const nextIndex = current.currentRoundIndex + 1;
      if (nextIndex >= current.rounds.length) {
        return { ...current, status: "complete" };
      }
      return { ...current, currentRoundIndex: nextIndex };
    });
    scrollToTop();
  }

  function restartRun(sourceRun: PatternAtlasRunState) {
    startPatternRun(sourceRun.mode, { fresh: true, ...(sourceRun.setup ? { setup: sourceRun.setup } : {}) });
  }

  if (loadError) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Pattern Atlas is unavailable</h1>
          <p>{loadError}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Loading Pattern Atlas</h1>
          <p>Preparing the highlighted countries.</p>
        </div>
      </section>
    );
  }

  if (!run) {
    return (
      <PatternAtlasLobby
        entitlementLoading={entitlementLoading}
        signedIn={signedIn}
        isFreeAccount={isFreeAccount}
        isProAccount={isProAccount}
        todayKey={todayKey}
        currentSampleRun={currentSampleRun}
        currentDailyRun={currentDailyRun}
        currentPracticeRun={currentPracticeRun}
        practiceFamily={practiceFamily}
        practiceDifficulty={practiceDifficulty}
        practiceMatches={practiceMatches}
        hasFullPracticeRun={hasFullPracticeRun}
        familyOptions={familyOptions}
        difficultyOptions={difficultyOptions}
        onFamilyChange={setPracticeFamily}
        onDifficultyChange={setPracticeDifficulty}
        onStart={startPatternRun}
      />
    );
  }

  if (run.status === "complete") {
    return (
      <PatternAtlasSummary
        run={run}
        signedIn={signedIn}
        isFreeAccount={isFreeAccount}
        onRestart={() => restartRun(run)}
        onLobby={() => setRun(null)}
      />
    );
  }

  const currentRule = ruleById.get(run.ruleIds[run.currentRoundIndex]);
  const currentState = run.rounds[run.currentRoundIndex];
  if (!currentRule || !currentState) {
    return (
      <section className="game-shell page-shell">
        <div className="empty-state surface">
          <h1>Pattern Atlas run is unavailable</h1>
          <p>This saved Pattern Atlas run references a rule that is no longer in the catalog.</p>
          <button className="button" type="button" onClick={() => setRun(null)}>
            Choose another run
          </button>
        </div>
      </section>
    );
  }

  if (currentState.solved) {
    return (
      <PatternAtlasReveal
        run={run}
        rule={currentRule}
        roundState={currentState}
        finalRound={run.currentRoundIndex + 1 >= run.rounds.length}
        map={data.map}
        countryNames={data.countryNames}
        sourceById={sourceById}
        onNext={nextRound}
      />
    );
  }

  const highlightedCountry = currentRule.includedIso3[0];
  const counterexample = currentRule.counterexampleIso3[0];
  const answerChoices = answerChoicesForRule(currentRule, run.currentRoundIndex);
  const rejectedChoices = new Set(currentState.rejectedAnswerIds);
  const latestRejectedChoice = answerChoices.find((choice) => currentState.rejectedAnswerIds.at(-1) === choice.id);
  const savedScore = run.rounds.slice(0, run.currentRoundIndex).reduce((total, round) => total + (round.solved ? round.score : 0), 0);
  const possibleTotal = savedScore + currentState.score;
  const solvedCount = run.rounds.filter((round) => round.solved).length;
  const activeContextChips = runContextChips(run);
  const ruleContextChips = [familyLabel(currentRule.family), difficultyLabel(currentRule.difficulty)].filter((chip) => !activeContextChips.includes(chip));

  return (
    <section className="play-layout page-shell" data-layout="dashboard">
      <div className="play-control-panel surface" aria-label="Pattern Atlas round dashboard">
        <div className="game-task-header">
          <div className="round-kicker">
            <span>
              Round {run.currentRoundIndex + 1} of {run.rounds.length}
            </span>
            {activeContextChips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
            {ruleContextChips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
          <div>
            <p className="eyebrow">Your task</p>
            <h1 id="pattern-atlas-title">What pattern connects these countries?</h1>
            <p>Read the highlighted set, use a clue if the shape feels slippery, then choose the rule.</p>
          </div>
        </div>
        <div className="score-hud" aria-label="Score status">
          <div className="score-hud-card score-hud-current">
            <span>This pattern</span>
            <strong key={currentState.score} data-score-tone={currentState.score < 0 ? "negative" : "positive"}>
              <span className="score-number">{currentState.score}</span> <span className="score-status-word">available</span>
            </strong>
            <small>
              Wrong answers cost {PATTERN_ATLAS_WRONG_ANSWER_PENALTY}. Clues cost {PATTERN_ATLAS_CLUE_PENALTY}.
            </small>
          </div>
          <div className="score-hud-card score-hud-banked">
            <span>Saved score</span>
            <strong>
              <span className="score-number">{savedScore}</span> points
            </strong>
            <small>After solved patterns.</small>
          </div>
          <div className="score-hud-card score-hud-possible">
            <span>Possible total</span>
            <strong>
              <span className="score-number">{possibleTotal}</span> if solved now
            </strong>
          </div>
        </div>
        <div className="clue-dashboard pattern-atlas-clues" aria-label="Pattern clues">
          <ClueButton
            label="Category"
            text={
              currentState.clues.family
                ? (
                    <>
                      Category family revealed:{" "}
                      <strong className="pattern-clue-value">{familyLabel(currentRule.family)}</strong>
                      {currentRule.family === "indicators" ? (
                        <span className="pattern-clue-helper">This rule comes from a mapped data indicator.</span>
                      ) : null}
                    </>
                  )
                : "Shows the broad type of rule, like borders, language, or data patterns."
            }
            used={currentState.clues.family}
            cost={PATTERN_ATLAS_CLUE_PENALTY}
            icon="family"
            actionLabel="Reveal category family"
            usedLabel="Category clue used"
            onClick={() => revealClue("family")}
          />
          <ClueButton
            label="Highlighted country"
            text={
              currentState.clues.highlightedCountry
                ? (
                    <>
                      One highlighted country:{" "}
                      <strong className="pattern-clue-value">{countryName(highlightedCountry, data.countryNames)}</strong>
                    </>
                  )
                : "Names one country from the highlighted set, not the full list."
            }
            used={currentState.clues.highlightedCountry}
            cost={PATTERN_ATLAS_CLUE_PENALTY}
            icon="highlight"
            actionLabel="Reveal one highlighted country"
            usedLabel="Country clue used"
            onClick={() => revealClue("highlightedCountry")}
          />
          <ClueButton
            label="Counterexample"
            text={
              currentState.clues.counterexample
                ? (
                    <>
                      Counterexample revealed:{" "}
                      <strong className="pattern-clue-value">{countryName(counterexample, data.countryNames)}</strong> is not highlighted.
                    </>
                  )
                : "Names a country that is not highlighted, helping rule out wrong patterns."
            }
            used={currentState.clues.counterexample}
            cost={PATTERN_ATLAS_CLUE_PENALTY}
            icon="counterexample"
            actionLabel="Reveal one country that does not fit"
            usedLabel="Counterexample clue used"
            onClick={() => revealClue("counterexample")}
          />
        </div>
        <div className="run-stats-card" aria-label="Run details">
          <span>{runModeLabel(run)}</span>
          <dl>
            <div>
              <dt>Patterns</dt>
              <dd>{run.rounds.length}</dd>
            </div>
            <div>
              <dt>Solved</dt>
              <dd>{solvedCount}</dd>
            </div>
            <div>
              <dt>Misses</dt>
              <dd>{currentState.rejectedAnswerIds.length}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd>{PATTERN_ATLAS_STARTING_SCORE}</dd>
            </div>
          </dl>
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {currentState.feedback}
        </div>
      </div>
      <div className="play-map-panel" aria-label="Pattern evidence" data-testid="pattern-atlas-board">
        <div className="map-evidence-header">
          <div>
            <p className="eyebrow">Map evidence</p>
            <h2>Read the highlighted countries.</h2>
          </div>
          <div className="map-key-inline" aria-label="Map key">
            <span>Gold = highlighted</span>
            <span>Names hidden until clues or reveal</span>
          </div>
        </div>
        <WorldMap
          map={data.map}
          highlightedIso3={currentRule.includedIso3}
          countryNames={data.countryNames}
          interactive={false}
          showCountryTooltip={false}
          labelledBy="pattern-atlas-title"
        />
        <div className="inspection-readout" data-state="empty" aria-live="polite">
          <span>Prompt</span>
          <strong>What pattern connects these countries?</strong>
          <p>Country names stay hidden in the map. Use the clue buttons when you want a small opening.</p>
        </div>
        <div className="play-action-dock surface" data-state={latestRejectedChoice ? "miss" : "choosing"} aria-label="Answer actions">
          <div className="answer-box primary-answer-box" data-placement="dock">
            <div className="answer-box-heading">
              <div>
                <span>Pick one answer</span>
                <h2>Which rule is shown?</h2>
              </div>
              <small>
                Wrong answers cost {PATTERN_ATLAS_WRONG_ANSWER_PENALTY}. Clues cost {PATTERN_ATLAS_CLUE_PENALTY}.
              </small>
            </div>
            <div className="choice-list">
              {answerChoices.map((choice) => {
                const rejected = rejectedChoices.has(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="choice-button"
                    data-rejected={rejected ? "true" : "false"}
                    disabled={rejected}
                    onClick={() => submitAnswer(choice, currentRule)}
                  >
                    <span>{choice.label}</span>
                    {rejected ? <small>Rejected</small> : null}
                  </button>
                );
              })}
            </div>
            {currentState.rejectedAnswerIds.length > 0 ? (
              <div className="attempt-history">
                <strong>Rejected</strong>
                <span>{answerChoices.filter((choice) => rejectedChoices.has(choice.id)).map((choice) => choice.label).join(", ")}</span>
              </div>
            ) : null}
          </div>
          {latestRejectedChoice ? (
            <div className="answer-feedback-banner" data-result="incorrect" role="status" aria-live="polite">
              <span>Incorrect</span>
              <strong>{latestRejectedChoice.label}</strong>
              <em>-{PATTERN_ATLAS_WRONG_ANSWER_PENALTY} points</em>
              <p>Cross it off and read the remaining geography.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function practiceSetupFromFilters(filters: PatternAtlasRuleFilters): PatternAtlasRunSetup {
  return {
    kind: "pro-pattern-run",
    ...(filters.family ? { family: filters.family } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {})
  };
}

function PatternAtlasLobby({
  entitlementLoading,
  signedIn,
  isFreeAccount,
  isProAccount,
  todayKey,
  currentSampleRun,
  currentDailyRun,
  currentPracticeRun,
  practiceFamily,
  practiceDifficulty,
  practiceMatches,
  hasFullPracticeRun,
  familyOptions,
  difficultyOptions,
  onFamilyChange,
  onDifficultyChange,
  onStart
}: {
  entitlementLoading: boolean;
  signedIn: boolean;
  isFreeAccount: boolean;
  isProAccount: boolean;
  todayKey: string;
  currentSampleRun: PatternAtlasRunState | null;
  currentDailyRun: PatternAtlasRunState | null;
  currentPracticeRun: PatternAtlasRunState | null;
  practiceFamily: PatternAtlasFamily | "";
  practiceDifficulty: PatternAtlasDifficulty | "";
  practiceMatches: PatternAtlasRule[];
  hasFullPracticeRun: boolean;
  familyOptions: Array<{ family: PatternAtlasFamily; count: number }>;
  difficultyOptions: Array<{ difficulty: PatternAtlasDifficulty; count: number }>;
  onFamilyChange: (family: PatternAtlasFamily | "") => void;
  onDifficultyChange: (difficulty: PatternAtlasDifficulty | "") => void;
  onStart: (mode: PatternAtlasRunMode, options?: { fresh?: boolean; setup?: PatternAtlasRunSetup }) => void;
}) {
  const dailyActionLabel = currentDailyRun?.status === "complete" ? "View Pattern Atlas Daily" : currentDailyRun ? "Resume Pattern Atlas Daily" : "Start Pattern Atlas Daily";
  const sampleActionLabel = currentSampleRun?.status === "active" ? "Resume Sample Run" : currentSampleRun?.status === "complete" ? "Play sample again" : "Start sample run";
  const practiceActionLabel = currentPracticeRun?.status === "active" ? "Start new Pattern Run" : "Start Pattern Run";

  return (
    <section className="game-entry page-shell">
      <div className="entry-copy">
        <p className="eyebrow">Pattern Atlas</p>
        <h1 className="page-title">What pattern connects these countries?</h1>
        <p className="lead">
          Read highlighted country sets, spot the shared rule, and spend clues carefully. Pattern Atlas uses its own local progress and does not affect
          Mystery Map scores or streaks.
        </p>
        <div className="entry-facts" aria-label="Pattern Atlas facts">
          <span>3 patterns per run</span>
          <span>Country names hidden</span>
          <span>{entitlementLoading ? "Checking account" : signedIn ? "Account-aware" : "No account needed"}</span>
        </div>
      </div>
      <div className="entry-panel surface" aria-label="Pattern Atlas modes">
        <div className="mode-panel-heading lobby-heading">
          <p className="setup-kicker">Choose your game mode</p>
          <h2>Ready to find the rule?</h2>
          <p>
            {isProAccount
              ? "Play today's Daily or start a Pro Pattern Run from the broader rule catalog."
              : isFreeAccount
                ? "Your free account gets today's Pattern Atlas Daily with local progress."
                : "Try the fixed Pattern Atlas Sample Run. No account needed and no account stats saved."}
          </p>
        </div>
        {!signedIn ? (
          <article className="lobby-primary-card" data-state="ready" aria-label="Pattern Atlas Sample Run">
            <div className="lobby-primary-copy">
              <p className="setup-kicker">Sample Run</p>
              <h3>Pattern Atlas Sample Run</h3>
              <p>No account needed. These three starter patterns stay fixed, and no account stats are saved.</p>
              <span className="mode-state-pill">Sample run / no account needed</span>
            </div>
            <p className="mode-card-note">Use the sample to learn the clue and reveal rhythm before signing in.</p>
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
          <article className="lobby-primary-card" data-state={currentDailyRun?.status === "complete" ? "complete" : "ready"} aria-label="Pattern Atlas Free Daily">
            <div className="lobby-primary-copy">
              <p className="setup-kicker">Free Daily</p>
              <h3>Pattern Atlas Daily</h3>
              <p>Three deterministic rules for {todayKey}. Local progress resumes safely if you reload.</p>
              <span className="mode-state-pill">{currentDailyRun?.status === "active" ? "Daily in progress" : "Free Daily"}</span>
            </div>
            <p className="mode-card-note">Pattern Atlas Daily is separate from Mystery Map Daily score and streaks.</p>
            <div className="lobby-primary-actions">
              <button className="button lobby-play-button" type="button" onClick={() => onStart("daily")}>
                <span className="lobby-play-main">PLAY</span>
                <small>{dailyActionLabel}</small>
              </button>
              {!isProAccount ? (
                <Link className="button-secondary" href="/upgrade">
                  Go Pro for Pattern Runs
                </Link>
              ) : null}
            </div>
          </article>
        )}
        {isProAccount ? (
          <section className="lobby-secondary" aria-label="Pro Pattern Atlas options">
            <div className="mode-panel-heading mode-panel-heading-secondary">
              <p className="setup-kicker">Pro option</p>
              <h2>Start a Pattern Run.</h2>
              <p>Choose a light filter or leave everything open. This does not add archives, sharing, leaderboards, or stats sync yet.</p>
            </div>
            <div className="mode-card-grid mode-card-grid-secondary">
              <article className="mode-card mode-card-practice" aria-label="Pro Pattern Run">
                <p className="setup-kicker">Pro Pattern Run</p>
                <h3>Custom rule set</h3>
                <p>Draw three rules from practice-eligible Pattern Atlas content.</p>
                <div className="practice-filters" aria-label="Pattern Run filters">
                  <label>
                    Family
                    <select value={practiceFamily} onChange={(event) => onFamilyChange(event.target.value as PatternAtlasFamily | "")}>
                      <option value="">All families</option>
                      {familyOptions.map((option) => (
                        <option key={option.family} value={option.family}>
                          {familyLabel(option.family)} ({option.count})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Difficulty
                    <select value={practiceDifficulty} onChange={(event) => onDifficultyChange(event.target.value as PatternAtlasDifficulty | "")}>
                      <option value="">All difficulties</option>
                      {difficultyOptions.map((option) => (
                        <option key={option.difficulty} value={option.difficulty}>
                          {difficultyLabel(option.difficulty)} ({option.count})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mode-card-note">
                  {hasFullPracticeRun
                    ? `${practiceMatches.length} rules available for this setup.`
                    : "Try broader filters for a full 3-pattern run."}
                </p>
                <div className="mode-card-actions">
                  {currentPracticeRun?.status === "active" ? (
                    <button className="button-secondary" type="button" onClick={() => onStart("practice")}>
                      Resume Pattern Run
                    </button>
                  ) : null}
                  <button
                    className="button"
                    type="button"
                    disabled={!hasFullPracticeRun}
                    onClick={() => onStart("practice", { fresh: true, setup: practiceSetupFromFilters({ family: practiceFamily || undefined, difficulty: practiceDifficulty || undefined }) })}
                  >
                    {practiceActionLabel}
                  </button>
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function ClueButton({
  label,
  text,
  used,
  cost,
  icon,
  actionLabel,
  usedLabel,
  onClick
}: {
  label: string;
  text: ReactNode;
  used: boolean;
  cost: number;
  icon: "family" | "highlight" | "counterexample";
  actionLabel: string;
  usedLabel: string;
  onClick: () => void;
}) {
  const Icon = icon === "family" ? Lightbulb : icon === "highlight" ? MapPin : XCircle;
  return (
    <div className="clue-action-card">
      <span>{label}</span>
      <p>{text}</p>
      <button className="button-secondary full-width" type="button" disabled={used} onClick={onClick}>
        <Icon size={18} aria-hidden="true" />
        {used ? usedLabel : `${actionLabel} -${cost}`}
      </button>
    </div>
  );
}

function PatternAtlasReveal({
  run,
  rule,
  roundState,
  finalRound,
  map,
  countryNames,
  sourceById,
  onNext
}: {
  run: PatternAtlasRunState;
  rule: PatternAtlasRule;
  roundState: PatternAtlasRoundState;
  finalRound: boolean;
  map: MapFeatureCollection;
  countryNames: Map<string, string>;
  sourceById: Map<string, PatternAtlasSource>;
  onNext: () => void;
}) {
  const scoreText = `${roundState.score >= 0 ? "+" : ""}${roundState.score.toLocaleString("en-US")} points`;
  const resultTone = roundState.rejectedAnswerIds.length > 0 ? "recovered" : "correct";
  const scopeNote = mappedScopeNote(rule);
  const highlightedCountries = countryRows(rule.includedIso3, countryNames);
  const sources = rule.sources.map((sourceId) => sourceById.get(sourceId)).filter((source): source is PatternAtlasSource => Boolean(source));
  const clueCount = Object.values(roundState.clues).filter(Boolean).length;
  const clueSpend = clueCount * PATTERN_ATLAS_CLUE_PENALTY;

  return (
    <section className="reveal-layout page-shell">
      <div className="reveal-panel surface" aria-label="Pattern Atlas reveal details">
        <div className="round-result-banner" data-result={resultTone} role="status" aria-live="polite">
          <span>{resultTone === "correct" ? "Correct" : "Answer found"}</span>
          <strong>{rule.displayAnswer}</strong>
          <p>{rule.explanation}</p>
          <em>{scoreText}</em>
        </div>
        <div className="reveal-action-dock" aria-label="Round action">
          <div className="round-transition-card" data-final={finalRound ? "true" : "false"}>
            <span>{finalRound ? `${runModeLabel(run)} complete` : `Pattern ${run.currentRoundIndex + 2} of ${run.rounds.length}`}</span>
            <strong>{finalRound ? "All patterns scored." : "Next pattern ready."}</strong>
            <em>Banked {scoreText}</em>
            <div className="transition-pips" aria-hidden="true">
              {run.ruleIds.map((ruleId, index) => (
                <i key={ruleId} data-state={index <= run.currentRoundIndex ? "banked" : index === run.currentRoundIndex + 1 ? "next" : "locked"} />
              ))}
            </div>
            <small>{finalRound ? "Open the local run summary." : "Keep reading country sets, not labels."}</small>
          </div>
          <button className="button full-width next-map-button" type="button" onClick={onNext}>
            {finalRound ? "Open summary" : "Next pattern"}
          </button>
        </div>
        <div className="reveal-dashboard-grid">
          <div className="reveal-scoreline">
            <span>Correct rule</span>
            <strong>{rule.displayAnswer}</strong>
            <small>{scoreText}</small>
          </div>
          <dl className="point-breakdown" aria-label="Point breakdown">
            <div>
              <dt>Started</dt>
              <dd>{PATTERN_ATLAS_STARTING_SCORE.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Misses</dt>
              <dd>{roundState.rejectedAnswerIds.length ? `-${roundState.rejectedAnswerIds.length * PATTERN_ATLAS_WRONG_ANSWER_PENALTY}` : "0"}</dd>
            </div>
            <div>
              <dt>Clues</dt>
              <dd>{clueSpend ? `-${clueSpend}` : "0"}</dd>
            </div>
            <div>
              <dt>Earned</dt>
              <dd>{scoreText}</dd>
            </div>
          </dl>
        </div>
        {scopeNote ? (
          <section className="lesson-card caveat-card" aria-labelledby="pattern-scope-heading">
            <h2 id="pattern-scope-heading">Mapped-country scope</h2>
            <p>{scopeNote}</p>
          </section>
        ) : null}
        <section className="lesson-card lesson-card-strong reveal-key-evidence" aria-labelledby="pattern-explanation-heading">
          <h2 id="pattern-explanation-heading">Why this pattern fits</h2>
          <p>{rule.explanation}</p>
        </section>
        <section className="lesson-card" aria-labelledby="pattern-country-heading">
          <h2 id="pattern-country-heading">Highlighted countries</h2>
          <ul className="pattern-atlas-country-list">
            {highlightedCountries.map((country) => (
              <li key={country.iso3}>
                <strong>{country.name}</strong>
                <span>{country.iso3}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="lesson-card" aria-labelledby="pattern-decoy-heading">
          <h2 id="pattern-decoy-heading">Why the other answers were tempting</h2>
          <ul className="confusion-list">
            {rule.decoys.map((decoy) => (
              <li key={decoy.displayAnswer}>
                <strong>{decoy.displayAnswer}</strong>
                <span>{decoy.whyWrong}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="lesson-card" aria-labelledby="pattern-source-heading">
          <h2 id="pattern-source-heading">Sources</h2>
          <ul className="pattern-atlas-source-list">
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.sourceReference}>{sourceLabel(source)}</a>
                <span>{source.retrievedAt ? `Retrieved ${source.retrievedAt}` : source.license}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="reveal-map" data-result={resultTone}>
        <p className="eyebrow">Map reveal</p>
        <h1 id="pattern-reveal-map-title">{rule.displayAnswer}</h1>
        <p className="full-indicator-title">{rule.explanation}</p>
        <div className="source-badges" aria-label="Pattern metadata">
          <span>{runModeLabel(run)}</span>
          <span>{familyLabel(rule.family)}</span>
          <span>{difficultyLabel(rule.difficulty)}</span>
          <span>{highlightedCountries.length} highlighted</span>
        </div>
        <WorldMap
          map={map}
          highlightedIso3={rule.includedIso3}
          countryNames={countryNames}
          interactive={false}
          labelledBy="pattern-reveal-map-title"
        />
        <div className="solve-moment-overlay" data-result={resultTone} aria-hidden="true">
          <span>{resultTone === "correct" ? "Correct" : "Answer found"}</span>
          <strong>Solved</strong>
          <em>{scoreText}</em>
        </div>
      </div>
    </section>
  );
}

function PatternAtlasSummary({
  run,
  signedIn,
  isFreeAccount,
  onRestart,
  onLobby
}: {
  run: PatternAtlasRunState;
  signedIn: boolean;
  isFreeAccount: boolean;
  onRestart: () => void;
  onLobby: () => void;
}) {
  const finalScore = run.rounds.reduce((total, round) => total + (round.solved ? round.score : 0), 0);
  const showGuestSampleCta = run.mode === "sample" && !signedIn;
  const showFreeDailyCompleteCta = run.mode === "daily" && isFreeAccount;
  return (
    <section className="game-shell page-shell pattern-atlas-summary">
      <div className="empty-state surface">
        <p className="eyebrow">{runModeLabel(run)} complete</p>
        <h1>{finalScore.toLocaleString("en-US")} points</h1>
        <p>{runSummaryCopy(run)}</p>
        <div className="result-cells" aria-label="Per-round scores">
          {run.rounds.map((round, index) => (
            <span key={run.ruleIds[index]}>
              <small>Pattern {index + 1}</small>
              <strong>{round.score}</strong>
            </span>
          ))}
        </div>
        {showGuestSampleCta ? (
          <section className="pattern-atlas-account-cta" aria-label="Keep playing Pattern Atlas">
            <div>
              <p className="eyebrow">Free or Pro</p>
              <h2>Start Pro or continue free.</h2>
              <p>
                Sample progress stays local. Create a free account to save Free Daily progress, or start Pro to unlock more Pattern Atlas
                and the full Can You Geo library.
              </p>
            </div>
          </section>
        ) : null}
        {showFreeDailyCompleteCta ? (
          <section className="pattern-atlas-account-cta" aria-label="Keep playing with Pro">
            <div>
              <p className="eyebrow">Daily complete</p>
              <h2>You&apos;ve used today&apos;s free Pattern Atlas rounds.</h2>
              <p>Go Pro to keep playing Pattern Runs, or choose another game in the Can You Geo library.</p>
            </div>
          </section>
        ) : null}
        {showGuestSampleCta ? (
          <div className="pattern-atlas-summary-actions" aria-label="Sample completion actions">
            <Link className="button" href="/upgrade">
              Start Pro
            </Link>
            <Link className="button-secondary" href="/sign-up">
              Create free account
            </Link>
            <button className="button-secondary" type="button" onClick={onRestart}>
              <Compass size={18} aria-hidden="true" />
              Play again
            </button>
            <button className="button-secondary" type="button" onClick={onLobby}>
              Choose mode
            </button>
          </div>
        ) : showFreeDailyCompleteCta ? (
          <div className="pattern-atlas-summary-actions" aria-label="Daily completion actions">
            <Link className="button" href="/upgrade">
              Go Pro to keep playing
            </Link>
            <Link className="button-secondary" href="/play">
              Choose another game
            </Link>
          </div>
        ) : (
          <div className="pattern-atlas-summary-actions" aria-label="Run completion actions">
            <button className="button" type="button" onClick={onRestart}>
              <Compass size={18} aria-hidden="true" />
              Play again
            </button>
            <button className="button-secondary" type="button" onClick={onLobby}>
              Choose mode
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
