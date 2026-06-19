import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { encodeChallenge } from "../../src/lib/game/challenge";
import { selectDailyRoundIds } from "../../src/lib/game/daily";

const TEST_DATE = "2026-06-18";
const artifactRoot = path.join(process.cwd(), "output/playwright");

type RoundsArtifact = {
  rounds: Array<{
    id: string;
    correctIndicatorId: string;
    category: string;
    difficulty: string;
    choices: {
      analyst: Array<{ indicatorId: string; label: string }>;
    };
  }>;
};

const roundsArtifact = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/v1/rounds.json"), "utf8")) as RoundsArtifact;
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/v1/manifest.json"), "utf8")) as { contentVersion: string };
const roundsById = new Map(roundsArtifact.rounds.map((round) => [round.id, round]));
const dailyRoundIds = selectDailyRoundIds(roundsArtifact.rounds as never, manifest.contentVersion, TEST_DATE);

function correctLabelForRoundId(roundId: string): string {
  const round = roundsById.get(roundId);
  if (!round) throw new Error(`Missing test round ${roundId}`);
  const choice = round.choices.analyst.find((item) => item.indicatorId === round.correctIndicatorId);
  if (!choice) throw new Error(`Missing correct choice for ${round.id}`);
  return choice.label;
}

function correctLabel(index: number): string {
  return correctLabelForRoundId(dailyRoundIds[index]);
}

function wrongLabel(index: number): string {
  const round = roundsById.get(dailyRoundIds[index]);
  if (!round) throw new Error(`Missing test round ${index}`);
  const choice = round.choices.analyst.find((item) => item.indicatorId !== round.correctIndicatorId);
  if (!choice) throw new Error(`Missing wrong choice for ${round.id}`);
  return choice.label;
}

async function startDaily(page: Page) {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Daily|Continue today's Daily|View completed Daily/ }).click();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
}

function scoreValue(page: Page) {
  return page.locator(".score-block strong");
}

function countryPath(page: Page, iso3: string) {
  return page.locator(`.country-path[data-iso3="${iso3}"]`).first();
}

async function dragMap(page: Page) {
  const box = await page.locator(".world-map").boundingBox();
  if (!box) throw new Error("Map bbox missing");
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.52);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.48, { steps: 8 });
  await page.mouse.up();
}

async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => window.scrollY === 0);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("first visit starts the Analyst Daily", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read the world." })).toBeVisible();
  await page.getByRole("link", { name: /Play today's Worldprint/i }).click();
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).click();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
});

test("investigating a country charges once", async ({ page }) => {
  await startDaily(page);
  const resetView = page.getByRole("button", { name: "Reset map view" });
  await expect(resetView).toBeDisabled();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(resetView).toBeEnabled();
  await resetView.click();
  await expect(resetView).toBeDisabled();
  await expect(scoreValue(page)).toHaveText("1000");

  await countryPath(page, "MEX").click();
  await expect(page.getByText("Selected: Mexico")).toBeVisible();
  await expect(page.getByText(/Reveal cost: 100 points/)).toBeVisible();
  await expect(scoreValue(page)).toHaveText("1000");
  await expect(countryPath(page, "MEX")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await dragMap(page);
  await expect(page.getByText("Selected: Mexico")).toBeVisible();
  await expect(countryPath(page, "MEX")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await expect(page.locator(".inspection-readout").getByText("Mexico")).toBeVisible();
  await page.getByRole("button", { name: /Show Mexico's value/i }).click();
  await expect(page.getByText("Mexico was already investigated")).toBeVisible();
  await expect(scoreValue(page)).toHaveText("900");
});

test("panning the zoomed map does not select or reveal a country", async ({ page }) => {
  await startDaily(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await dragMap(page);
  await expect(scoreValue(page)).toHaveText("1000");
  await expect(page.getByText("No country selected")).toBeVisible();
  await expect(page.getByRole("button", { name: /Reveal selected country value/i })).toBeDisabled();
});

test("no-data and exhausted investigations are explained without surprise charges", async ({ page }) => {
  const noDataCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: ["worldprint-secondary-enrollment"]
  });
  await page.goto(`/challenge/worldprint?c=${noDataCode}`);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  await page.locator("#country-search").selectOption({ label: "United States" });
  await expect(page.locator(".selected-country-card").getByText(/No data for this round/)).toBeVisible();
  await page.getByRole("button", { name: /Confirm United States has no data/i }).click();
  await expect(scoreValue(page)).toHaveText("1000");

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).click();
  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("750");
  await page.locator("#country-search").selectOption({ label: "Canada" });
  await expect(page.getByText(/No paid investigations remaining in this tier/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Reveal Canada's value/i })).toBeDisabled();
});

test("wrong answer recovers and correct answer reveals the source", async ({ page }) => {
  await startDaily(page);
  await page.getByRole("button", { name: wrongLabel(0) }).click();
  await expect(page.getByText(/Incorrect/)).toBeVisible();
  await page.getByRole("button", { name: correctLabel(0) }).click();
  await expect(page.getByText(/Source and year/)).toBeVisible();
  await expect(page.getByText(/What the map was showing/)).toBeVisible();
  await expect(page.getByText(/Why the wrong answers were tempting/)).toBeVisible();
});

test("completes a five-round Daily and preserves completed result", async ({ page }) => {
  await startDaily(page);
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: correctLabel(index) }).click();
    await expect(page.getByText(/Source and year/)).toBeVisible();
    await page.getByRole("button", { name: index === 4 ? /See results/ : /Next round/ }).click();
  }
  await expect(page.getByRole("heading", { name: /points/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Share result/i })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /View completed Daily/i }).click();
  await expect(page.getByRole("heading", { name: /points/i })).toBeVisible();
  await page.goto("/archive/worldprint");
  await expect(page.getByRole("heading", { name: /Recent Daily games/i })).toBeVisible();
  await expect(page.getByText(/5,000 points · Analyst/i)).toBeVisible();
});

test("archive route opens a dated Daily without affecting today's streak", async ({ page }) => {
  await page.goto(`/play/worldprint/${TEST_DATE}`);
  await expect(page.getByText(`WORLDPRINT Archive — ${TEST_DATE}`)).toBeVisible();
  await expect(page.getByText(/Archive plays do not change today's streak/i)).toBeVisible();
  await expect(page.getByRole("button", { name: `Start ${TEST_DATE} Daily` })).toBeVisible();
  await page.getByRole("button", { name: `Start ${TEST_DATE} Daily` }).click();
  await expect(page.getByText(`Archive ${TEST_DATE}`)).toBeVisible();
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: correctLabel(index) }).click();
    await page.getByRole("button", { name: index === 4 ? /See results/ : /Next round/ }).click();
  }
  await expect(page.getByText(/Daily streaks are unaffected/i)).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("worldprint:v1") ?? "{}") as { streak?: { current: number }; archiveHistoryByDate?: Record<string, unknown> });
  expect(stored.streak?.current).toBe(0);
  expect(stored.archiveHistoryByDate?.[TEST_DATE]).toBeTruthy();
});

test("challenge link opens exact selected rounds and saves challenge completion", async ({ page }) => {
  const challengeRoundIds = dailyRoundIds.slice(0, 3);
  const code = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: challengeRoundIds
  });
  await page.goto(`/challenge/worldprint?c=${code}`);
  await expect(page.getByRole("heading", { name: /Play the exact same maps/i })).toBeVisible();
  await expect(page.getByText("3 maps")).toBeVisible();
  await page.getByRole("button", { name: /Start challenge/i }).click();
  for (let index = 0; index < challengeRoundIds.length; index += 1) {
    await page.getByRole("button", { name: correctLabelForRoundId(challengeRoundIds[index]) }).click();
    await page.getByRole("button", { name: index === challengeRoundIds.length - 1 ? /See results/ : /Next round/ }).click();
  }
  await expect(page.getByText(/Challenge complete/i)).toBeVisible();
  await expect(page.getByLabel("Spoiler-free challenge share text")).not.toHaveValue(/fertility|life expectancy|World Bank/i);
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("worldprint:v1") ?? "{}") as { streak?: { current: number }; challengeHistoryById?: Record<string, unknown> });
  expect(stored.streak?.current).toBe(0);
  expect(Object.keys(stored.challengeHistoryById ?? {})).toHaveLength(1);
});

test("invalid challenge links show a polished error", async ({ page }) => {
  await page.goto("/challenge/worldprint?c=not-a-real-code");
  await expect(page.getByText(/Challenge unavailable/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /cannot be opened/i })).toBeVisible();
  const retiredCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: ["worldprint-rural-population"]
  });
  await page.goto(`/challenge/worldprint?c=${retiredCode}`);
  await expect(page.getByRole("heading", { name: /Some maps in this challenge are missing/i })).toBeVisible();
});

test("refresh preserves an active run", async ({ page }) => {
  await startDaily(page);
  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await page.reload();
  await page.getByRole("button", { name: /Continue today's Daily/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
});

test("keyboard-only answer flow works", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
  await page.getByRole("button", { name: correctLabel(0) }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/What the map was showing/)).toBeVisible();
});

test("practice filters start a filtered preview run", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await expect(page.getByText(/Choose how you play/i)).toBeVisible();
  await expect(page.getByText(/Choose what you practice/i)).toBeVisible();
  await expect(page.getByLabel("Map difficulty")).toBeVisible();
  await expect(page.getByText(/Choose filters, then build a random practice set/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeDisabled();
  await page.getByRole("button", { name: /Build random practice set/i }).click();
  const setCode = page.locator(".practice-set-card small");
  await expect(page.getByText(/Practice set ready/i)).toBeVisible();
  await expect(page.getByText(/3 maps selected from 36 matching maps/i)).toBeVisible();
  await expect(page.getByText(/These 3 maps will be used when you start Practice/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeEnabled();
  await expect(setCode).toContainText(/Set code/i);

  await page.locator("#practice-category").selectOption("agriculture");
  await page.locator("#practice-difficulty").selectOption("intro");
  await expect(page.getByText("No maps match these filters.")).toBeVisible();
  await expect(page.getByText("Loosen the category or map difficulty filter.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Build random practice set/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeDisabled();

  await page.locator("#practice-category").selectOption("health");
  await page.locator("#practice-difficulty").selectOption("expert");
  await page.getByRole("button", { name: /Build random practice set/i }).click();
  await expect(page.getByText(/3 maps selected from 4 matching maps/i)).toBeVisible();
  await expect(page.getByText(/Category mix: health/i)).toBeVisible();
  await expect(page.getByText(/Map difficulty mix: Expert/i)).toBeVisible();
  await page.getByRole("button", { name: /Start this 3-map practice set/i }).click();
  await expect(page.getByText("Practice").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
  await page.waitForFunction(() => {
    const stored = JSON.parse(window.localStorage.getItem("worldprint:v1") ?? "{}") as { activePracticeRun?: { rounds?: unknown[] } };
    return stored.activePracticeRun?.rounds?.length === 3;
  });
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("worldprint:v1") ?? "{}") as { activePracticeRun?: { rounds?: Array<{ roundId: string }> } });
  const activeRoundIds = stored.activePracticeRun?.rounds?.map((round) => round.roundId) ?? [];
  expect(activeRoundIds).toHaveLength(3);
  expect(
    activeRoundIds.every((id) => {
      const round = roundsById.get(id);
      return round?.category === "health" && round.difficulty === "expert";
    })
  ).toBe(true);
});

test("skill tiers change answer interface and clue support", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Explorer").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Reveal unit clue/i })).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Reveal unit clue/i })).toHaveCount(0);

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Atlas Master").check();
  await page.getByRole("button", { name: /Start today's Daily/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(0);
  await expect(page.getByLabel("Search approved indicators")).toBeVisible();
});

test("mobile viewport has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await startDaily(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset map view" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/how-to-play");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/about");
  await expect(page.getByRole("link", { name: /Read sources and licenses/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/archive/worldprint");
  await expect(page.getByRole("heading", { name: /Recent Daily games/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/internal/worldprint-review");
  await expect(page.getByRole("heading", { name: /Indicator review board/i })).toBeVisible();
  await page.locator(".review-filters").getByLabel("Status").selectOption("retired");
  await expect(page.getByText(/Showing 2 of 56 indicators/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const challengeCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: dailyRoundIds.slice(0, 3)
  });
  await page.goto(`/challenge/worldprint?c=${challengeCode}`);
  await expect(page.getByRole("heading", { name: /Play the exact same maps/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("axe scans landing, active game, and reveal", async ({ page }) => {
  await page.goto("/");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/how-to-play");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/about");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/archive/worldprint");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: /How editorial eligibility works/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/internal/worldprint-review");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const challengeCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: dailyRoundIds.slice(0, 3)
  });
  await page.goto(`/challenge/worldprint?c=${challengeCode}`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await startDaily(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: correctLabel(0) }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("captures deterministic visual screenshots", async ({ page }, testInfo) => {
  const dir = path.join(artifactRoot, testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  await page.goto("/");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "landing.png"), fullPage: true });
  await page.goto("/how-to-play");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "how-to-play.png"), fullPage: true });
  await page.goto("/about");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "about.png"), fullPage: true });
  await page.goto("/archive/worldprint");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "archive.png"), fullPage: true });
  await page.goto("/internal/worldprint-review");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "internal-review.png"), fullPage: true });
  await page.goto("/sources");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "sources.png"), fullPage: true });
  await page.goto(`/play/worldprint/${TEST_DATE}`);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "historical-daily-intro.png"), fullPage: true });
  const visualChallengeCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: dailyRoundIds.slice(0, 3)
  });
  await page.goto(`/challenge/worldprint?c=${visualChallengeCode}`);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "challenge-intro.png"), fullPage: true });
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByRole("button", { name: /Build random practice set/i }).click();
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "tier-selection.png"), fullPage: true });
  await page.locator("#practice-category").selectOption("agriculture");
  await page.locator("#practice-difficulty").selectOption("intro");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "practice-zero-matches.png"), fullPage: true });
  await startDaily(page);
  await countryPath(page, "MEX").click();
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({ path: path.join(dir, "active-game.png"), fullPage: false });
  await page.getByRole("button", { name: correctLabel(0) }).click();
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({ path: path.join(dir, "reveal.png"), fullPage: false });
  await page.goto(`/challenge/worldprint?c=${visualChallengeCode}`);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: correctLabelForRoundId(dailyRoundIds[index]) }).click();
    await page.getByRole("button", { name: index === 2 ? /See results/ : /Next round/ }).click();
  }
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "challenge-complete.png"), fullPage: true });
});
