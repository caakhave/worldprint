import type { RoundPlayState, RunState } from "@/lib/game/state";
import { challengeNumber } from "@/lib/game/daily";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { publicSiteOrigin } from "@/lib/site/origin";

export type ShareRoundTone = "clean" | "clued" | "miss" | "incomplete";

export type ResultShareSummary = {
  title: string;
  resultLabel: string;
  score: number;
  possible: number;
  rankTitle: string;
  rankNote: string;
  tierLabel: string;
  solvedCount: number;
  roundCount: number;
  missCount: number;
  clueSpend: number;
  strip: string;
  rounds: ShareRoundTone[];
};

export function scoreCell(score: number): string {
  if (score >= 800) return "🟩";
  if (score >= 500) return "🟨";
  return "🟥";
}

export function scoreRank(total: number, roundCount: number) {
  const possible = Math.max(1, roundCount * 1000);
  const ratio = total / possible;
  if (ratio >= 0.92) return { title: "Atlas Master", note: "Elite pattern reading across the whole run." };
  if (ratio >= 0.76) return { title: "Pattern Hunter", note: "Strong reads, sharp clue discipline." };
  if (ratio >= 0.52) return { title: "Atlas Reader", note: "Good signal work with room to tighten the clues." };
  return { title: "Signal Seeker", note: "The map gave up its secrets. Now chase the cleaner read." };
}

function runTitle(run: RunState): string {
  if (run.mode === "sample") return "Can You Geo? Sample Run";
  if (run.mode === "daily") return `Can You Geo? Daily #${challengeNumber(run.dateKey)}`;
  if (run.mode === "atlas") return "Can You Geo? Pro Atlas";
  if (run.mode === "archive") return `Can You Geo? Past Game Replay · ${run.dateKey}`;
  if (run.mode === "challenge") return "Can You Geo? Challenge";
  return "Can You Geo? Practice";
}

function resultLabel(run: RunState): string {
  if (run.mode === "sample") return "Sample Run result";
  if (run.mode === "daily") return "Free Daily result";
  if (run.mode === "atlas") return "Atlas result";
  if (run.mode === "archive") return "Past Game replay";
  if (run.mode === "challenge") return "Challenge result";
  return "Practice result";
}

function roundClueSpend(round: RoundPlayState, tier: RunState["tier"]): number {
  const countrySpend = round.investigations.reduce((sum, investigation) => sum + Math.max(0, investigation.cost), 0);
  const unitSpend = round.unitClueUsed ? TIER_CONFIGS[tier].scoring.unitCluePenalty : 0;
  return countrySpend + unitSpend;
}

export function roundShareTone(round: RoundPlayState, tier: RunState["tier"]): ShareRoundTone {
  if (round.phase !== "solved") return "incomplete";
  if (round.rejectedAnswers.length > 0) return "miss";
  if (roundClueSpend(round, tier) > 0) return "clued";
  return "clean";
}

export function shareCellForTone(tone: ShareRoundTone): string {
  if (tone === "clean") return "🟩";
  if (tone === "clued") return "🟨";
  if (tone === "miss") return "🟥";
  return "⬛";
}

export function buildResultShareSummary(run: RunState): ResultShareSummary {
  const score = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const possible = run.rounds.length * 1000;
  const rank = scoreRank(score, run.rounds.length);
  const rounds = run.rounds.map((round) => roundShareTone(round, run.tier));
  const missCount = run.rounds.reduce((sum, round) => sum + round.rejectedAnswers.length, 0);
  const clueSpend = run.rounds.reduce((sum, round) => sum + roundClueSpend(round, run.tier), 0);
  return {
    title: runTitle(run),
    resultLabel: resultLabel(run),
    score,
    possible,
    rankTitle: rank.title,
    rankNote: rank.note,
    tierLabel: TIER_CONFIGS[run.tier].shortLabel,
    solvedCount: run.rounds.filter((round) => round.phase === "solved").length,
    roundCount: run.rounds.length,
    missCount,
    clueSpend,
    strip: rounds.map(shareCellForTone).join(""),
    rounds
  };
}

export function buildShareText(run: RunState, options: { challengeUrl?: string } = {}): string {
  const summary = buildResultShareSummary(run);
  const lines = [
    summary.title,
    `${summary.score.toLocaleString("en-US")} pts · ${summary.rankTitle}`,
    `${summary.resultLabel} · ${summary.tierLabel} · ${summary.solvedCount}/${summary.roundCount} solved`,
    summary.strip,
    options.challengeUrl ?? publicSiteOrigin()
  ];
  return lines.join("\n");
}

export function containsSpoiler(text: string, forbidden: string[]): boolean {
  const normalized = text.toLowerCase();
  return forbidden.some((item) => item.length > 2 && normalized.includes(item.toLowerCase()));
}
