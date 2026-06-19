import type { RunState } from "@/lib/game/state";
import { challengeNumber } from "@/lib/game/daily";
import { TIER_CONFIGS } from "@/lib/game/scoring";

export function scoreCell(score: number): string {
  if (score >= 800) return "🟩";
  if (score >= 500) return "🟨";
  return "🟥";
}

function runHeading(run: RunState): string {
  if (run.mode === "daily") return `WORLDPRINT Daily #${challengeNumber(run.dateKey)} — ${run.dateKey}`;
  if (run.mode === "archive") return `WORLDPRINT Archive — ${run.dateKey}`;
  if (run.mode === "challenge") return "WORLDPRINT Challenge";
  return "WORLDPRINT Practice";
}

export function buildShareText(run: RunState, options: { challengeUrl?: string } = {}): string {
  const total = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const possible = run.rounds.length * 1000;
  const cells = run.rounds.map((round) => scoreCell(round.score)).join("");
  const lines = [
    runHeading(run),
    TIER_CONFIGS[run.tier].shortLabel,
    cells,
    `${total.toLocaleString("en-US")} / ${possible.toLocaleString("en-US")}`,
    options.challengeUrl ? "Read the world:" : "Read the world.",
    ...(options.challengeUrl ? [options.challengeUrl] : [])
  ];
  return lines.join("\n");
}

export function containsSpoiler(text: string, forbidden: string[]): boolean {
  const normalized = text.toLowerCase();
  return forbidden.some((item) => item.length > 2 && normalized.includes(item.toLowerCase()));
}
