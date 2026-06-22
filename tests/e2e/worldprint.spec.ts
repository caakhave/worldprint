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
const externalBetaPacks = JSON.parse(readFileSync(path.join(process.cwd(), "generated/reports/external-beta-test-packs.json"), "utf8")) as {
  packs: Array<{ id: string; name: string; mapCount: number; challenges: Array<{ id: string; label: string; path: string; roundIds: string[] }> }>;
};
const externalBetaLinks = JSON.parse(readFileSync(path.join(process.cwd(), "generated/reports/external-beta-challenge-links.json"), "utf8")) as {
  links: Array<{ packId: string; packName: string; challengeId: string; label: string; path: string; roundIds: string[]; mapCount: number }>;
};
const roundsById = new Map(roundsArtifact.rounds.map((round) => [round.id, round]));
const dailyRoundIds = selectDailyRoundIds(roundsArtifact.rounds as never, manifest.contentVersion, TEST_DATE);
const introPracticeCount = roundsArtifact.rounds.filter((round) => round.difficulty === "intro").length;
const healthExpertPracticeCount = roundsArtifact.rounds.filter((round) => round.category === "health" && round.difficulty === "expert").length;
const paletteScreenshotRounds = [
  { slug: "health-rose", roundId: "worldprint-life-expectancy", palette: "rose" },
  { slug: "agriculture-green", roundId: "worldprint-cereal-yield", palette: "green" },
  { slug: "connectivity-electric", roundId: "worldprint-internet-users", palette: "electric" }
] as const;

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
  await page.getByRole("button", { name: /Start today's Mystery Map|Continue today's Mystery Map|View completed Mystery Map/ }).click();
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
  await expect(page.getByRole("heading", { name: "Can You Geo?" })).toBeVisible();
  await expect(page.getByText("A new way to play the planet")).toBeVisible();
  await expect(page.locator(".hero-copy .lead")).toHaveText("Read the world.");
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await page.getByRole("link", { name: /Play today's Mystery Map/i }).click();
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
});

test("landing hero map demo steps update motion state", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByTestId("hero-map-stage");
  await expect(page.locator(".hero-map-stage .world-map")).toBeVisible();
  await expect(stage).toHaveAttribute("data-demo-step", "1");
  await expect(page.getByRole("button", { name: /Start with shape/i })).toHaveAttribute("aria-pressed", "true");
  const firstMotionKey = Number(await stage.getAttribute("data-motion-key"));

  await page.getByRole("button", { name: /Spend score to reveal country values/i }).click();
  await expect(stage).toHaveAttribute("data-demo-step", "2");
  await expect(page.getByRole("button", { name: /Spend score to reveal country values/i })).toHaveAttribute("aria-pressed", "true");
  await expect(stage.locator(".hero-step-investigate")).toHaveAttribute("data-active", "true");
  expect(Number(await stage.getAttribute("data-motion-key"))).toBeGreaterThan(firstMotionKey);

  await page.getByRole("button", { name: /Guess the hidden indicator/i }).focus();
  await page.keyboard.press("Enter");
  await expect(stage).toHaveAttribute("data-demo-step", "3");
  await expect(page.getByRole("button", { name: /Guess the hidden indicator/i })).toHaveAttribute("aria-pressed", "true");
  await expect(stage.locator(".hero-step-resolve")).toHaveAttribute("data-active", "true");

  await page.getByRole("button", { name: /Start with shape/i }).click();
  await expect(stage).toHaveAttribute("data-demo-step", "1");
  await expect(stage.locator(".hero-step-shape")).toHaveAttribute("data-active", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("landing hero reduced-motion mode keeps the active visual state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stage = page.getByTestId("hero-map-stage");
  await expect(page.locator(".hero-map-stage .world-map")).toBeVisible();
  await page.getByRole("button", { name: /Spend score to reveal country values/i }).click();
  await expect(stage).toHaveAttribute("data-demo-step", "2");
  await expect(stage.locator(".hero-step-investigate")).toHaveAttribute("data-active", "true");
  await page.getByRole("button", { name: /Guess the hidden indicator/i }).click();
  await expect(stage).toHaveAttribute("data-demo-step", "3");
  await expect(stage.locator(".hero-step-resolve")).toHaveAttribute("data-active", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
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
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("750");
  await page.locator("#country-search").selectOption({ label: "Canada" });
  await expect(page.getByText(/No point-cost investigations remaining in this tier/i)).toBeVisible();
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
  await page.getByRole("button", { name: /View completed Mystery Map/i }).click();
  await expect(page.getByRole("heading", { name: /points/i })).toBeVisible();
  await page.goto("/archive/worldprint");
  await expect(page.getByRole("heading", { name: /Recent Daily Mystery Maps/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await expect(page.getByText(/5,000 points · Analyst/i)).toBeVisible();
});

test("archive route opens a dated Daily without affecting today's streak", async ({ page }) => {
  await page.goto(`/play/worldprint/${TEST_DATE}`);
  await expect(page.getByText(`Mystery Map Archive — ${TEST_DATE}`)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await expect(page.getByText(/Archive plays do not change today's streak/i)).toBeVisible();
  await expect(page.getByRole("button", { name: `Start ${TEST_DATE} Mystery Map` })).toBeVisible();
  await page.getByRole("button", { name: `Start ${TEST_DATE} Mystery Map` }).click();
  await expect(page.getByText(`Mystery Map Archive ${TEST_DATE}`)).toBeVisible();
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
  const challengeShare = page.getByLabel("Spoiler-free challenge share text");
  await expect(challengeShare).toHaveValue(/Can You Geo\?/i);
  await expect(challengeShare).toHaveValue(/Mystery Map/i);
  await expect(challengeShare).not.toHaveValue(/WORLDPRINT/);
  await expect(challengeShare).not.toHaveValue(/fertility|life expectancy|World Bank/i);
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
  await page.getByRole("button", { name: /Continue today's Mystery Map/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
});

test("keyboard-only answer flow works", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
  await page.getByRole("button", { name: correctLabel(0) }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/What the map was showing/)).toBeVisible();
});

test("practice filters start a filtered preview run", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await expect(page.getByText(/Choose how you play/i)).toBeVisible();
  await expect(page.getByText(/Open beta: no account required/i)).toBeVisible();
  await expect(page.getByText(/125 playable maps/i)).toBeVisible();
  await expect(page.getByText(/50 Daily-ready maps/i)).toBeVisible();
  await expect(page.getByText(/Future plan: try 3 maps instantly/i)).toBeVisible();
  await expect(page.getByTestId("entry-atlas-visual")).toBeVisible();
  await expect(page.getByText(/Optional practice/i)).toBeVisible();
  await expect(page.getByLabel("Map difficulty")).toBeVisible();
  await expect(page.getByLabel("Map difficulty")).toHaveValue("intro");
  await expect(page.getByText(/Practice is the open 3-map warm-up/i)).toBeVisible();
  await expect(page.getByText(/Build a random Intro practice set/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeDisabled();
  await page.getByRole("button", { name: /Build practice set/i }).click();
  const setCode = page.locator(".practice-set-card small");
  await expect(page.getByText(/Practice set ready/i)).toBeVisible();
  await expect(page.getByText(new RegExp(`3 maps selected from ${introPracticeCount} matching maps`, "i"))).toBeVisible();
  await expect(page.getByText(/These 3 maps will be used when you start Practice/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeEnabled();
  await expect(setCode).toContainText(/Set code/i);

  await page.locator("#practice-category").selectOption("agriculture");
  await page.locator("#practice-difficulty").selectOption("intro");
  await expect(page.getByText("No maps match these filters.")).toBeVisible();
  await expect(page.getByText("Loosen the category or map difficulty filter.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Build practice set/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Start this 3-map practice set/i })).toBeDisabled();

  await page.locator("#practice-category").selectOption("health");
  await page.locator("#practice-difficulty").selectOption("expert");
  await page.getByRole("button", { name: /Build practice set/i }).click();
  await expect(page.getByText(new RegExp(`3 maps selected from ${healthExpertPracticeCount} matching maps`, "i"))).toBeVisible();
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

test("external beta page renders packs, feedback template, and static challenge links", async ({ page }) => {
  await page.goto("/beta/worldprint");
  await expect(page.getByRole("heading", { name: /Test whether the maps read cleanly/i })).toBeVisible();
  await expect(page.getByText(/open beta, not paid launch readiness/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await expect(page.getByText(/125/).first()).toBeVisible();
  await expect(page.getByText(/50/).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/198 playable maps|167 playable maps/i);
  await expect(page.getByRole("link", { name: /sign up|subscribe|checkout/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Copy feedback template/i })).toBeVisible();
  await expect(page.locator(".feedback-template li").filter({ hasText: /Would you create a free account for 3 maps\/day/i })).toBeVisible();

  for (const pack of externalBetaPacks.packs) {
    await expect(page.getByRole("heading", { name: pack.name })).toBeVisible();
    await expect(page.getByText(new RegExp(`${pack.mapCount} maps`, "i")).first()).toBeVisible();
    for (const challenge of pack.challenges) {
      await expect(page.getByRole("link", { name: new RegExp(challenge.label, "i") })).toHaveAttribute("href", challenge.path);
    }
  }
});

test("external beta challenge links load exact pack intros", async ({ page }) => {
  for (const link of externalBetaLinks.links) {
    await page.goto(link.path);
    await expect(page.getByRole("heading", { name: /Play the exact same maps/i })).toBeVisible();
    await expect(page.getByText(`${link.mapCount} maps`)).toBeVisible();
    await expect(page.getByRole("button", { name: /Start challenge/i })).toBeVisible();
  }
});

test("skill tiers change answer interface and clue support", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Explorer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Reveal unit clue/i })).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Reveal unit clue/i })).toHaveCount(0);

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Atlas Master").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(0);
  await expect(page.getByLabel("Search playable map catalog")).toBeVisible();
});

test("mobile viewport has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can You Geo?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
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
  await expect(page.getByRole("heading", { name: /Recent Daily Mystery Maps/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/internal/worldprint-review");
  await expect(page.getByRole("heading", { name: /Indicator review board/i })).toBeVisible();
  await page.locator(".review-filters").getByLabel("Status").selectOption("retired");
  await expect(page.getByText(/Showing 9 of 198 candidates/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/beta/worldprint");
  await expect(page.getByRole("heading", { name: /Test whether the maps read cleanly/i })).toBeVisible();
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
  await page.goto("/beta/worldprint");
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
  await expect(page.getByText(/Future access model/i)).toBeVisible();
  await expect(page.getByText(/Accounts, Stripe, and billing are not implemented/i)).toBeVisible();
  const heroStage = page.getByTestId("hero-map-stage");
  await expect(page.locator(".hero-map-stage .world-map")).toBeVisible();
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "landing.png"), fullPage: true });
  await page.screenshot({ path: path.join(dir, "landing-step-1.png"), fullPage: true });
  await page.getByRole("button", { name: /Spend score to reveal country values/i }).click();
  await expect(heroStage).toHaveAttribute("data-demo-step", "2");
  await page.waitForTimeout(700);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "landing-step-2.png"), fullPage: true });
  await page.getByRole("button", { name: /Guess the hidden indicator/i }).click();
  await expect(heroStage).toHaveAttribute("data-demo-step", "3");
  await page.waitForTimeout(700);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "landing-step-3.png"), fullPage: true });
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
  await page.goto("/beta/worldprint");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-worldprint.png"), fullPage: true });
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "play-setup.png"), fullPage: true });
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
  const introPack = externalBetaLinks.links.find((link) => link.challengeId === "intro-pack");
  const dailyStress = externalBetaLinks.links.find((link) => link.challengeId === "daily-ready-stress-a");
  const ambiguityEdge = externalBetaLinks.links.find((link) => link.challengeId === "ambiguity-edge-a");
  if (!introPack || !dailyStress || !ambiguityEdge) throw new Error("Missing external beta challenge links");
  await page.goto(introPack.path);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-intro-pack-challenge-intro.png"), fullPage: true });
  await page.goto(dailyStress.path);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-daily-ready-stress-challenge-intro.png"), fullPage: true });
  await page.goto(ambiguityEdge.path);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-ambiguity-edge-challenge-intro.png"), fullPage: true });
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByRole("button", { name: /Build practice set/i }).click();
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "tier-selection.png"), fullPage: true });
  await page.getByRole("button", { name: /Start this 3-map practice set/i }).click();
  await expect(page.getByText("Practice").first()).toBeVisible();
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "practice-active.png"), fullPage: false });
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.locator("#practice-category").selectOption("agriculture");
  await page.locator("#practice-difficulty").selectOption("intro");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "practice-zero-matches.png"), fullPage: true });
  for (const example of paletteScreenshotRounds) {
    await page.evaluate(() => window.localStorage.clear());
    const paletteChallengeCode = encodeChallenge({
      kind: "practice",
      contentVersion: manifest.contentVersion,
      tier: "analyst",
      roundIds: [example.roundId]
    });
    await page.goto(`/challenge/worldprint?c=${paletteChallengeCode}`);
    await page.getByRole("button", { name: /Start challenge/i }).click();
    await expect(page.locator(".map-frame").first()).toHaveAttribute("data-palette", example.palette);
    await scrollToTop(page);
    await page.screenshot({ path: path.join(dir, `palette-${example.slug}.png`), fullPage: false });
  }
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
  await page.goto(introPack.path);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  for (let index = 0; index < introPack.roundIds.length; index += 1) {
    await page.getByRole("button", { name: correctLabelForRoundId(introPack.roundIds[index]) }).click();
    await page.getByRole("button", { name: index === introPack.roundIds.length - 1 ? /See results/ : /Next round/ }).click();
  }
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-intro-pack-complete.png"), fullPage: true });
});
