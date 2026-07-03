"use client";

import { Compass, Lightbulb, MapPin, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { getPatternAtlasSampleRules } from "@/features/pattern-atlas/sampleRun";
import { loadEntityRegistry, loadManifest, loadMap } from "@/lib/content/loaders";
import type { Entity, MapFeatureCollection } from "@/lib/content/schemas";
import { countryNameByIso3 } from "@/lib/geo/format";
import { PATTERN_ATLAS_CATALOG } from "@/lib/pattern-atlas/catalog";
import type {
  PatternAtlasDecoy,
  PatternAtlasDifficulty,
  PatternAtlasFamily,
  PatternAtlasRule,
  PatternAtlasSource
} from "@/lib/pattern-atlas/schemas";

const STARTING_SCORE = 1000;
const WRONG_ANSWER_PENALTY = 300;
const CLUE_PENALTY = 100;
const SAMPLE_RULES = getPatternAtlasSampleRules();
const DIFFICULTY_LABELS: Record<PatternAtlasDifficulty, string> = {
  intro: "Intro",
  standard: "Standard",
  expert: "Expert"
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

type RoundState = {
  score: number;
  solved: boolean;
  rejectedAnswerIds: string[];
  feedback: string;
  clues: {
    family: boolean;
    highlightedCountry: boolean;
    counterexample: boolean;
  };
};

function initialRoundState(): RoundState {
  return {
    score: STARTING_SCORE,
    solved: false,
    rejectedAnswerIds: [],
    feedback: "",
    clues: {
      family: false,
      highlightedCountry: false,
      counterexample: false
    }
  };
}

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
  return family
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function updateRoundState(states: RoundState[], index: number, updater: (round: RoundState) => RoundState) {
  return states.map((round, roundIndex) => (roundIndex === index ? updater(round) : round));
}

export function PatternAtlasClient({ initialData }: { initialData?: PatternAtlasLoadedData }) {
  const [data, setData] = useState<PatternAtlasLoadedData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [runComplete, setRunComplete] = useState(false);
  const [roundStates, setRoundStates] = useState<RoundState[]>(() => SAMPLE_RULES.map(() => initialRoundState()));
  const sourceById = useMemo(() => new Map(PATTERN_ATLAS_CATALOG.sourceRegistry.map((source) => [source.id, source])), []);

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

  const currentRule = SAMPLE_RULES[currentRoundIndex];
  const currentState = roundStates[currentRoundIndex];
  const answerChoices = useMemo(() => answerChoicesForRule(currentRule, currentRoundIndex), [currentRule, currentRoundIndex]);
  const savedScore = roundStates.slice(0, currentRoundIndex).reduce((total, round) => total + (round.solved ? round.score : 0), 0);
  const possibleTotal = savedScore + currentState.score;
  const finalScore = roundStates.reduce((total, round) => total + (round.solved ? round.score : 0), 0);

  function revealClue(clue: keyof RoundState["clues"]) {
    setRoundStates((current) =>
      updateRoundState(current, currentRoundIndex, (round) => {
        if (round.solved || round.clues[clue]) return round;
        return {
          ...round,
          score: round.score - CLUE_PENALTY,
          feedback: `Clue revealed. -${CLUE_PENALTY} points.`,
          clues: { ...round.clues, [clue]: true }
        };
      })
    );
  }

  function submitAnswer(choice: AnswerChoice) {
    setRoundStates((current) =>
      updateRoundState(current, currentRoundIndex, (round) => {
        if (round.solved || round.rejectedAnswerIds.includes(choice.id)) return round;
        if (choice.correct) {
          return {
            ...round,
            solved: true,
            feedback: `Correct. ${currentRule.displayAnswer}.`
          };
        }
        return {
          ...round,
          score: round.score - WRONG_ANSWER_PENALTY,
          rejectedAnswerIds: [...round.rejectedAnswerIds, choice.id],
          feedback: `${choice.label} is not the pattern. -${WRONG_ANSWER_PENALTY} points.`
        };
      })
    );
  }

  function nextRound() {
    if (currentRoundIndex + 1 >= SAMPLE_RULES.length) {
      setRunComplete(true);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
      return;
    }
    setCurrentRoundIndex((current) => current + 1);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function restartRun() {
    setCurrentRoundIndex(0);
    setRunComplete(false);
    setRoundStates(SAMPLE_RULES.map(() => initialRoundState()));
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
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

  if (runComplete) {
    return <PatternAtlasSummary finalScore={finalScore} roundStates={roundStates} onRestart={restartRun} />;
  }

  if (currentState.solved) {
    return (
      <PatternAtlasReveal
        rule={currentRule}
        roundIndex={currentRoundIndex}
        roundState={currentState}
        finalRound={currentRoundIndex + 1 >= SAMPLE_RULES.length}
        map={data.map}
        countryNames={data.countryNames}
        sourceById={sourceById}
        onNext={nextRound}
      />
    );
  }

  const highlightedCountry = currentRule.includedIso3[0];
  const counterexample = currentRule.counterexampleIso3[0];
  const rejectedChoices = new Set(currentState.rejectedAnswerIds);
  const latestRejectedChoice = answerChoices.find((choice) => currentState.rejectedAnswerIds.at(-1) === choice.id);

  return (
    <section className="play-layout page-shell" data-layout="dashboard">
      <div className="play-control-panel surface" aria-label="Pattern Atlas round dashboard">
        <div className="game-task-header">
          <div className="round-kicker">
            <span>
              Round {currentRoundIndex + 1} of {SAMPLE_RULES.length}
            </span>
            <span>Pattern Atlas</span>
            <span>{familyLabel(currentRule.family)}</span>
            <span>{difficultyLabel(currentRule.difficulty)}</span>
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
              Wrong answers cost {WRONG_ANSWER_PENALTY}. Clues cost {CLUE_PENALTY}.
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
            text={currentState.clues.family ? familyLabel(currentRule.family) : "Reveal the family this pattern belongs to."}
            used={currentState.clues.family}
            cost={CLUE_PENALTY}
            icon="family"
            onClick={() => revealClue("family")}
          />
          <ClueButton
            label="Highlighted country"
            text={currentState.clues.highlightedCountry ? countryName(highlightedCountry, data.countryNames) : "Reveal one country in the highlighted set."}
            used={currentState.clues.highlightedCountry}
            cost={CLUE_PENALTY}
            icon="highlight"
            onClick={() => revealClue("highlightedCountry")}
          />
          <ClueButton
            label="Counterexample"
            text={currentState.clues.counterexample ? `${countryName(counterexample, data.countryNames)} is not highlighted.` : "Reveal one country that does not fit."}
            used={currentState.clues.counterexample}
            cost={CLUE_PENALTY}
            icon="counterexample"
            onClick={() => revealClue("counterexample")}
          />
        </div>
        <div className="run-stats-card" aria-label="Run details">
          <span>Sample run</span>
          <dl>
            <div>
              <dt>Patterns</dt>
              <dd>{SAMPLE_RULES.length}</dd>
            </div>
            <div>
              <dt>Solved</dt>
              <dd>{currentRoundIndex}</dd>
            </div>
            <div>
              <dt>Misses</dt>
              <dd>{currentState.rejectedAnswerIds.length}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd>{STARTING_SCORE}</dd>
            </div>
          </dl>
        </div>
        <div className="status-live" role="status" aria-live="polite">
          {currentState.feedback}
        </div>
      </div>
      <div className="play-map-panel" aria-label="Pattern evidence">
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
                Wrong answers cost {WRONG_ANSWER_PENALTY}. Clues cost {CLUE_PENALTY}.
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
                    onClick={() => submitAnswer(choice)}
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
              <em>-{WRONG_ANSWER_PENALTY} points</em>
              <p>Cross it off and read the remaining geography.</p>
            </div>
          ) : null}
        </div>
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
  onClick
}: {
  label: string;
  text: string;
  used: boolean;
  cost: number;
  icon: "family" | "highlight" | "counterexample";
  onClick: () => void;
}) {
  const Icon = icon === "family" ? Lightbulb : icon === "highlight" ? MapPin : XCircle;
  return (
    <div className="clue-action-card">
      <span>{label}</span>
      <p>{text}</p>
      <button className="button-secondary full-width" type="button" disabled={used} onClick={onClick}>
        <Icon size={18} aria-hidden="true" />
        {used ? "Clue revealed" : `Reveal ${label.toLowerCase()} -${cost}`}
      </button>
    </div>
  );
}

function PatternAtlasReveal({
  rule,
  roundIndex,
  roundState,
  finalRound,
  map,
  countryNames,
  sourceById,
  onNext
}: {
  rule: PatternAtlasRule;
  roundIndex: number;
  roundState: RoundState;
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
  const clueSpend = clueCount * CLUE_PENALTY;

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
            <span>{finalRound ? "Sample complete" : `Pattern ${roundIndex + 2} of ${SAMPLE_RULES.length}`}</span>
            <strong>{finalRound ? "All sample patterns scored." : "Next pattern ready."}</strong>
            <em>Banked {scoreText}</em>
            <div className="transition-pips" aria-hidden="true">
              {SAMPLE_RULES.map((ruleItem, index) => (
                <i key={ruleItem.id} data-state={index <= roundIndex ? "banked" : index === roundIndex + 1 ? "next" : "locked"} />
              ))}
            </div>
            <small>{finalRound ? "Open the local sample summary." : "Keep reading country sets, not labels."}</small>
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
              <dd>{STARTING_SCORE.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Misses</dt>
              <dd>{roundState.rejectedAnswerIds.length ? `-${roundState.rejectedAnswerIds.length * WRONG_ANSWER_PENALTY}` : "0"}</dd>
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
  finalScore,
  roundStates,
  onRestart
}: {
  finalScore: number;
  roundStates: RoundState[];
  onRestart: () => void;
}) {
  return (
    <section className="game-shell page-shell pattern-atlas-summary">
      <div className="empty-state surface">
        <p className="eyebrow">Pattern Atlas sample complete</p>
        <h1>{finalScore.toLocaleString("en-US")} points</h1>
        <p>This local sample run is not saved yet. Daily, archive, custom runs, stats, and sharing are intentionally out of scope for this phase.</p>
        <div className="result-cells" aria-label="Per-round scores">
          {roundStates.map((round, index) => (
            <span key={SAMPLE_RULES[index].id}>
              <small>Pattern {index + 1}</small>
              <strong>{round.score}</strong>
            </span>
          ))}
        </div>
        <button className="button" type="button" onClick={onRestart}>
          <Compass size={18} aria-hidden="true" />
          Play sample again
        </button>
      </div>
    </section>
  );
}
