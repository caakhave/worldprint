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
      explorer: Array<{ indicatorId: string; label: string }>;
      analyst: Array<{ indicatorId: string; label: string }>;
      cartographer: Array<{ indicatorId: string; label: string }>;
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
const paletteScreenshotRounds = [
  { slug: "health-rose", roundId: "worldprint-life-expectancy", palette: "rose" },
  { slug: "agriculture-green", roundId: "worldprint-cereal-yield", palette: "green" },
  { slug: "connectivity-electric", roundId: "worldprint-internet-users", palette: "electric" }
] as const;

type ChoiceTier = keyof RoundsArtifact["rounds"][number]["choices"];

function correctLabelForRoundId(roundId: string, tier: ChoiceTier = "analyst"): string {
  const round = roundsById.get(roundId);
  if (!round) throw new Error(`Missing test round ${roundId}`);
  const choice = round.choices[tier].find((item) => item.indicatorId === round.correctIndicatorId);
  if (!choice) throw new Error(`Missing correct choice for ${round.id}`);
  return choice.label;
}

function correctLabel(index: number, tier: ChoiceTier = "analyst"): string {
  return correctLabelForRoundId(dailyRoundIds[index], tier);
}

function wrongLabels(index: number, tier: ChoiceTier = "analyst"): string[] {
  const round = roundsById.get(dailyRoundIds[index]);
  if (!round) throw new Error(`Missing test round ${index}`);
  const labels = round.choices[tier].filter((item) => item.indicatorId !== round.correctIndicatorId).map((item) => item.label);
  if (!labels.length) throw new Error(`Missing wrong choice for ${round.id}`);
  return labels;
}

function wrongLabel(index: number, tier: ChoiceTier = "analyst"): string {
  return wrongLabels(index, tier)[0];
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

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth)
  ).toBe(false);
}

async function expectHeaderWithinViewport(page: Page) {
  const metrics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const readRect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    return {
      viewportWidth,
      header: readRect(".site-header"),
      brand: readRect(".brand-link"),
      nav: readRect(".site-nav"),
      navLinks: Array.from(document.querySelectorAll(".site-nav a")).map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.textContent?.trim() ?? "", left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      })
    };
  });

  for (const rect of [metrics.header, metrics.brand, metrics.nav, ...metrics.navLinks]) {
    expect(rect).not.toBeNull();
    expect(rect!.width).toBeGreaterThan(0);
    expect(rect!.height).toBeGreaterThan(0);
    expect(rect!.left).toBeGreaterThanOrEqual(-0.5);
    expect(rect!.right).toBeLessThanOrEqual(metrics.viewportWidth + 0.5);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("first visit starts the Analyst Daily", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can you read the world?" })).toBeVisible();
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(primaryNav.getByRole("link", { name: "Play" })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
  await expect(primaryNav.getByRole("link", { name: "Past Games" })).toHaveAttribute("href", /\/archive\/worldprint\/?$/);
  await expect(primaryNav.getByRole("link", { name: "How it works" })).toHaveAttribute("href", /\/how-to-play\/?$/);
  await expect(primaryNav.getByRole("link")).toHaveCount(3);
  await expect(primaryNav.getByRole("link", { name: /Sources|Beta|About|Internal/i })).toHaveCount(0);
  const footerNav = page.getByRole("navigation", { name: "Footer navigation" });
  await expect(footerNav.getByRole("link", { name: "Sources" })).toHaveAttribute("href", /\/sources\/?$/);
  await expect(footerNav.getByRole("link", { name: "Terms, Privacy & Accessibility" })).toHaveAttribute("href", /\/legal\/?$/);
  await expect(footerNav.getByRole("link", { name: "Beta" })).toHaveAttribute("href", /\/beta\/worldprint\/?$/);
  await expect(footerNav.getByRole("link", { name: "About" })).toHaveAttribute("href", /\/about\/?$/);
  await expect(page.getByRole("link", { name: /Internal/i })).toHaveCount(0);
  await expect(page.locator(".hero-copy .eyebrow")).toHaveText("Join the daily challenge");
  await expect(page.locator(".hero-copy .lead")).toHaveText(
    "A new mystery map is waiting. Spot the pattern, spend your clues wisely, and guess what the planet is hiding."
  );
  await expect(page.getByText("Free to play while the atlas grows.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Join the daily challenge" })).toBeVisible();
  await expect(page.getByText("Five maps. One streak. A fresh world puzzle every day.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Start playing/i })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
  await expect(page.getByRole("heading", { name: "Read the map" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow the signal." })).toBeVisible();
  await expect(page.getByText("Every round is a tiny mystery: read the map, spend clues, make the call.")).toBeVisible();
  await expect(page.locator(".game-loop-tile")).toHaveCount(3);
  for (const imageName of ["01-read-the-map", "02-use-your-clues", "03-make-the-call"]) {
    await expect(page.locator(`img[src*="${imageName}.png"]`)).toHaveCount(1);
  }
  await expect(page.getByRole("heading", { name: "Choose your atlas run." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Play today", exact: true })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
  await expect(page.getByRole("link", { name: /Practice now/i })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
  await expect(page.locator(".mode-poster")).toHaveCount(3);
  for (const imageName of ["04-daily-mystery-map", "05-practice", "06-challenge-friends"]) {
    await expect(page.locator(`img[src*="${imageName}.png"]`)).toHaveCount(1);
  }
  await expect(page.getByRole("heading", { name: "Practice", exact: true })).toBeVisible();
  await expect(page.getByTestId("cinematic-home-hero").getByRole("link", { name: /^How it works$/i })).toHaveAttribute(
    "href",
    "#how-it-works"
  );
  await expect(page.locator(".hero-copy")).not.toContainText("Open beta: no account");
  await expect(page.locator(".hero-copy")).not.toContainText("Try 3-map practice");
  await expect(page.locator(".hero-copy")).not.toContainText("5-map Daily open now");
  await expect(page.locator("main")).not.toContainText(/World Bank|indicators|data visualization|filters|matching maps|generated|point-cost|pool|set code|educational tool/i);
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await page.getByRole("link", { name: /Play today's Mystery Map/i }).click();
  await expect(page.locator(".entry-atlas-preview")).toBeVisible();
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
});

test("landing cinematic hero replaces the fake gameplay panel", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("cinematic-home-hero");
  await expect(hero).toBeVisible();
  await expect(hero.getByRole("heading", { name: "Can you read the world?" })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Play today's Mystery Map/i })).toBeVisible();
  await expect(page.locator(".fake-gameplay-stage")).toHaveCount(0);
  await expect(page.locator(".fake-atlas-map")).toHaveCount(0);
  await expect(page.getByTestId("hero-map-stage")).toHaveCount(0);
  const video = page.getByTestId("homepage-hero-video");
  await expect(video).toBeAttached();
  await expect(video).toHaveAttribute("poster", "/images/homepage/can-you-geo-cinematic-hero.png");
  await expect(video).not.toHaveAttribute("controls", /.*/);
  await expect(video).not.toHaveAttribute("loop", /.*/);
  await expect(page.locator(".landing-hero-video source")).toHaveAttribute(
    "src",
    "/images/homepage/can-you-geo-cinematic-hero-720p.mp4"
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("landing cinematic hero respects reduced-motion without layout overflow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.getByTestId("cinematic-home-hero");
  await expect(hero).toBeVisible();
  await expect(hero.getByText("Free to play while the atlas grows.")).toBeVisible();
  await expect(page.locator(".fake-gameplay-stage")).toHaveCount(0);
  await expect(page.getByTestId("homepage-hero-video")).toHaveCount(0);
  await expect(page.getByTestId("homepage-hero-poster")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("investigating a country charges once", async ({ page }) => {
  await startDaily(page);
  await expect(page.getByText("Current map points available")).toBeVisible();
  await expect(page.getByText("These points are added to the run total after the map is solved.")).toBeVisible();
  const runStats = page.locator(".run-stats-card");
  await expect(runStats).toContainText("Run total so far");
  await expect(runStats).toContainText("Banked score");
  await expect(runStats).toContainText("Maps played");
  await expect(runStats).toContainText("Correct");
  await expect(runStats).toContainText("Average");
  await expect(runStats).toContainText("Best round");
  const resetView = page.getByRole("button", { name: "Reset map view" });
  await expect(resetView).toBeDisabled();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(resetView).toBeEnabled();
  await resetView.click();
  await expect(resetView).toBeDisabled();
  await expect(scoreValue(page)).toHaveText("1000");

  await countryPath(page, "MEX").click();
  await expect(page.locator(".selected-country-card").getByText("Mexico", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reveal cost: 100 points/)).toBeVisible();
  await expect(scoreValue(page)).toHaveText("1000");
  await expect(countryPath(page, "MEX")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await dragMap(page);
  await expect(page.locator(".selected-country-card").getByText("Mexico", { exact: true })).toBeVisible();
  await expect(countryPath(page, "MEX")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await expect(page.locator(".inspection-readout").getByText("Mexico")).toBeVisible();
  await expect(page.locator(".selected-country-card")).toContainText(/Revealed:/);
  await expect(page.locator(".selected-country-card")).toContainText("No points spent this time.");
  await expect(page.locator(".selected-country-card")).not.toContainText(/Already revealed:/i);
  await page.getByRole("button", { name: /Show Mexico's value/i }).click();
  await expect(page.getByText("Mexico already revealed. No points spent this time.")).toBeVisible();
  await expect(scoreValue(page)).toHaveText("900");
  await page.getByRole("button", { name: correctLabel(0) }).click();
  await page.getByRole("button", { name: /Next map/i }).click();
  await expect(page.locator("#country-search")).toHaveValue("");
  await expect(page.locator(".selected-country-card")).toHaveCount(0);
  await expect(page.locator(".inspection-readout")).toContainText("Pick a country");
});

test("map tooltip and selected country card use clean country names", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Analyst").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".selected-country-card")).toHaveCount(0);
  await countryPath(page, "MEX").hover();
  await expect(page.locator(".map-tooltip strong")).toHaveText("Mexico");
  await expect(page.locator(".map-tooltip strong")).not.toHaveText(/^Country$/);
  await expect(page.locator(".map-tooltip strong")).not.toHaveText("Unlabeled country");
  await countryPath(page, "MEX").focus();
  await expect(page.locator(".map-tooltip strong")).toHaveText("Mexico");

  await page.locator("#country-search").selectOption({ label: "Mexico" });
  const card = page.locator(".selected-country-card");
  await expect(card.getByText("Selected country")).toBeVisible();
  await expect(card.getByText("Mexico", { exact: true })).toHaveCount(1);
  await expect(card).not.toContainText("Selected: Mexico");
  await expectNoHorizontalOverflow(page);
});

test("unit clue and investigation history use flat 100-point costs", async ({ page }) => {
  await startDaily(page);
  await page.getByRole("button", { name: /Reveal unit: -100/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await expect(page.getByRole("button", { name: /Unit clue:/i })).toBeDisabled();

  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("800");
  await page.getByRole("button", { name: correctLabel(0) }).click();
  await expect(page.locator(".investigation-history").getByText("Unit clue")).toBeVisible();
  await expect(page.locator(".investigation-history").getByText("-100 points")).toHaveCount(2);
  await expect(page.locator(".investigation-history").getByText("Mexico")).toBeVisible();
});

test("revealed values keep compact units while unit clue explains them", async ({ page }) => {
  const compactUnitCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: ["worldprint-birth-rate"]
  });
  await page.goto(`/challenge/worldprint?c=${compactUnitCode}`);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await expect(page.locator(".selected-country-card")).toContainText(/Revealed: 15\.5 per 1k/);

  await page.getByRole("button", { name: /Reveal unit: -100/i }).click();
  await expect(scoreValue(page)).toHaveText("800");
  await expect(page.locator(".unit-clue")).toHaveText("Unit clue: per 1k means births per 1,000 people.");
  await expect(page.getByRole("button", { name: /Unit clue: per 1k means births per 1,000 people/i })).toBeDisabled();
});

test("obvious unit clues are shown free instead of charging points", async ({ page }) => {
  const obviousUnitCode = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "analyst",
    roundIds: ["worldprint-imports-share"]
  });
  await page.goto(`/challenge/worldprint?c=${obviousUnitCode}`);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  await expect(page.getByRole("button", { name: /Reveal unit/i })).toHaveCount(0);
  await expect(page.locator(".unit-clue")).toHaveText("Unit is already shown.");
  await expect(scoreValue(page)).toHaveText("1000");
});

test("panning the zoomed map does not select or reveal a country", async ({ page }) => {
  await startDaily(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await dragMap(page);
  await expect(scoreValue(page)).toHaveText("1000");
  await expect(page.locator(".selected-country-card")).toHaveCount(0);
  await expect(page.locator(".inspection-readout")).toContainText("Pick a country");
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
  await expect(page.locator(".selected-country-card").getByText(/No data for this country on this map/)).toBeVisible();
  await page.getByRole("button", { name: /Confirm United States has no data/i }).click();
  await expect(scoreValue(page)).toHaveText("1000");

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await page.locator("#country-search").selectOption({ label: "Mexico" });
  await page.getByRole("button", { name: /Reveal Mexico's value/i }).click();
  await expect(scoreValue(page)).toHaveText("900");
  await page.locator("#country-search").selectOption({ label: "Canada" });
  await expect(page.locator(".selected-country-card")).toContainText(/Country reveals used up for this round/i);
  await expect(page.getByRole("button", { name: /Reveal Canada's value/i })).toBeDisabled();
  await page.getByRole("button", { name: /Reveal unit: -100/i }).click();
  await expect(scoreValue(page)).toHaveText("800");
  await expect(page.getByRole("button", { name: /Unit clue:/i })).toBeDisabled();
});

test("negative round scores show a lost round message", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  for (const label of wrongLabels(0, "cartographer").slice(0, 4)) {
    await page.getByRole("button", { name: label }).click();
  }
  await expect(scoreValue(page)).toHaveText("-200");
  await page.getByRole("button", { name: correctLabel(0, "cartographer") }).click();
  await expect(page.getByText("Round lost: -200 points").first()).toBeVisible();
});

test("wrong answer recovers and correct answer reveals the source", async ({ page }) => {
  await startDaily(page);
  await page.getByRole("button", { name: wrongLabel(0) }).click();
  await expect(page.getByText(/Incorrect/)).toBeVisible();
  await page.getByRole("button", { name: correctLabel(0) }).click();
  await expect(page.getByText(/Answer revealed/i)).toBeVisible();
  await expect(page.getByText(/Correct answer:/i)).toBeVisible();
  await expect(page.locator(".banked-score-flight")).toContainText(/banked/i);
  await expect(page.getByText(/Source and year/)).toBeVisible();
  await expect(page.getByText(/What the map was showing/)).toBeVisible();
  await expect(page.getByText(/Why the wrong answers were tempting/)).toBeVisible();
});

test("completes a five-round Daily and preserves completed result", async ({ page }) => {
  await startDaily(page);
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: correctLabel(index) }).click();
    if (index === 0) {
      await expect(page.locator(".round-result-banner")).toContainText("Correct");
      await expect(page.locator(".round-result-banner")).toContainText("Solved");
      await expect(page.locator(".banked-score-flight")).toContainText("+1,000 points banked");
      await expect(page.getByText("Map 2 of 5")).toBeVisible();
      await expect(page.getByText("Next map is ready.")).toBeVisible();
    }
    await expect(page.getByText(/Source and year/)).toBeVisible();
    await page.getByRole("button", { name: index === 4 ? /See results/ : /Next map/ }).click();
  }
  await expect(page.getByRole("heading", { name: /points/i })).toBeVisible();
  await expect(page.getByText("Final score")).toBeVisible();
  await expect(page.getByText("Run rank")).toBeVisible();
  await expect(page.getByText("Worldprint Master")).toBeVisible();
  await expect(page.getByText("Clean reads")).toBeVisible();
  await expect(page.getByRole("button", { name: /Share result/i })).toBeVisible();
  const statsPanel = page.getByRole("complementary", { name: "Your stats" });
  await expect(statsPanel).toBeVisible();
  await expect(statsPanel).toContainText("Games completed");
  await expect(statsPanel).toContainText("Maps played");
  await expect(statsPanel).toContainText("Correct answers");
  await expect(statsPanel).toContainText("Total points");
  await expect(statsPanel).toContainText("5,000");
  await expect(statsPanel).toContainText("Average round");
  await expect(statsPanel).toContainText("1,000");
  await expect(page.locator(".account-save-card")).toContainText("Save your score and streak.");
  await expect(page.getByRole("link", { name: "Create a free account" })).toHaveAttribute("href", /\/sign-in\/?$/);
  await page.reload();
  await page.getByRole("button", { name: /View completed Mystery Map/i }).click();
  await expect(page.getByRole("heading", { name: /points/i })).toBeVisible();
  await page.goto("/archive/worldprint");
  await expect(page.getByRole("heading", { name: /Build your Mystery Map record book/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await expect(page.getByText("5,000 points").first()).toBeVisible();
  await expect(page.getByText("Analyst").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View record" }).first()).toBeVisible();
});

test("archive route opens a dated Daily without affecting today's streak", async ({ page }) => {
  await page.goto(`/play/worldprint/${TEST_DATE}`);
  await expect(page.getByText(`Past Mystery Map Replay · ${TEST_DATE}`)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  await expect(page.getByText(/Streak stays safe/i)).toBeVisible();
  await expect(page.getByText(/Past Mystery Map Replay/i).first()).toBeVisible();
  await expect(page.getByText(/No record yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play past map" })).toBeVisible();
  await page.getByRole("button", { name: "Play past map" }).click();
  await expect(page.getByText(`Past Mystery Map Replay ${TEST_DATE}`)).toBeVisible();
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: correctLabel(index) }).click();
    await page.getByRole("button", { name: index === 4 ? /See results/ : /Next map/ }).click();
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
    await page.getByRole("button", { name: index === challengeRoundIds.length - 1 ? /See results/ : /Next map/ }).click();
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

test("keyboard access reaches legal and sign-in controls", async ({ page }) => {
  await page.goto("/");
  const legalLink = page.getByRole("link", { name: "Terms, Privacy & Accessibility" });
  await legalLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/legal\/?$/);
  await expect(page.getByRole("heading", { name: "Accessibility" })).toBeVisible();

  await page.goto("/sign-in");
  await expect(page.locator(".account-primary-card h2")).not.toHaveText(/Checking your account/i);
  const email = page.getByLabel("Email");
  if (await email.isVisible()) {
    await email.focus();
    await page.keyboard.insertText("player@example.com");
    await expect(email).toHaveValue("player@example.com");
    await page.getByRole("button", { name: "Send sign-in link" }).focus();
    await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeFocused();
  } else {
    await page.getByRole("link", { name: "Keep playing" }).focus();
    await expect(page.getByRole("link", { name: "Keep playing" })).toBeFocused();
  }
});

test("practice filters start a filtered preview run", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await expect(page.getByText(/Choose how you play/i)).toBeVisible();
  await expect(page.getByText(/No account needed/i)).toBeVisible();
  await expect(page.getByText("5-map Daily", { exact: true })).toBeVisible();
  await expect(page.getByText(/Practice mode included/i)).toBeVisible();
  await expect(page.getByText(/Future plans will include instant demo play/i)).toBeVisible();
  await expect(page.getByTestId("entry-atlas-visual")).toBeVisible();
  await expect(page.getByRole("img", { name: /Stylized atlas globe showing mystery data-map patterns/i })).toBeVisible();
  await expect(page.getByText(/Optional practice/i)).toBeVisible();
  await expect(page.getByLabel("Map difficulty")).toBeVisible();
  await expect(page.getByLabel("Map difficulty")).toHaveValue("intro");
  await expect(page.getByText(/Pick a topic and difficulty/i)).toBeVisible();
  await expect(page.getByText(/3 maps ready/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Start practice/i })).toBeDisabled();
  await page.getByRole("button", { name: /Pick practice maps/i }).click();
  await expect(page.getByText(/Intro practice/i)).toBeVisible();
  await expect(page.getByText(/A quick warm-up before the Daily/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start practice/i })).toBeEnabled();
  await expect(page.locator(".practice-set-card")).not.toContainText(/Set code|Category mix|Map difficulty mix/i);

  await page.locator("#practice-category").selectOption("agriculture");
  await page.locator("#practice-difficulty").selectOption("intro");
  await expect(page.getByText("No practice maps found for this combo")).toBeVisible();
  await expect(page.getByText("Try another topic or difficulty.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pick practice maps/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Start practice/i })).toBeDisabled();

  await page.locator("#practice-category").selectOption("health");
  await page.locator("#practice-difficulty").selectOption("expert");
  await page.getByRole("button", { name: /Pick practice maps/i }).click();
  await expect(page.getByText(/Expert health practice/i)).toBeVisible();
  await expect(page.getByText(/3 maps ready/i).first()).toBeVisible();
  await expect(page.getByText(/A quick warm-up with trickier patterns/i)).toBeVisible();
  await expect(page.locator(".practice-set-card")).not.toContainText(/Set code|Category mix|Map difficulty mix/i);
  await page.getByRole("button", { name: /Start practice/i }).click();
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

test("sources page renders player-friendly data attribution without admin wording", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: /Real data, readable puzzles/i })).toBeVisible();
  await expect(page.getByText(/World Bank World Development Indicators/i)).toBeVisible();
  await expect(page.getByText(/Natural Earth Admin 0/i)).toBeVisible();
  await expect(page.getByText(/Mystery Map chooses years/i)).toBeVisible();
  await expect(page.locator(".sources-overview-grid")).toBeVisible();
  await expect(page.locator(".source-card")).toHaveCount(2);
  await expect(page.getByText(/Missing is not zero/i)).toBeVisible();
  await expect(page.getByText(/Daily-ready maps are checked/i)).toBeVisible();
  await expect(page.getByText(/Build details/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/candidate bank|source-valid|draft-held|data gate|generated report|pipeline/i);
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("account and sign-in stay optional, friendly, and local-first", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /Save your score and streak/i })).toBeVisible();
  await expect(page.getByText(/No password needed\. Enter your email and we'll send a secure one-time sign-in link/i)).toBeVisible();
  const emailSignInAvailable = await page.getByLabel("Email").isVisible();
  if (emailSignInAvailable) {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
  } else {
    await expect(page.getByRole("button", { name: "Create a free account" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Keep playing" })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
    await expect(page.getByText(/Email sign-in is not available in this preview/i)).toBeVisible();
  }
  await expect(page.getByText(/Gameplay still works without signing in/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to account" })).toHaveAttribute("href", /\/account\/?$/);
  await expect(page.locator("body")).not.toContainText(/magic link|Supabase|SQL|PKCE|webhook|Edge Function|configured/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /Your atlas, saved/i })).toBeVisible();
  await expect(page.getByText(/Play without an account/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Play today's Mystery Map/i })).toHaveAttribute("href", /\/play\/worldprint\/?$/);
  if (emailSignInAvailable) {
    await expect(page.locator(".account-primary-card").getByRole("heading", { name: /Create a free account to save your streak/i })).toBeVisible();
  } else {
    await expect(page.getByText(/Email sign-in is unavailable in this preview/i)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Playing without an account" })).toBeVisible();
  await expect(page.locator(".player-stats-panel")).toContainText("No saved games yet");
  await expect(page.locator("body")).not.toContainText(/Production spine|Supabase|SQL|webhook|Edge Function|Current plan: Guest|You are on Guest|account shell/i);
  if (emailSignInAvailable) {
    await expect(page.getByRole("link", { name: "Create a free account" })).toHaveAttribute("href", /\/sign-in\/?$/);
  } else {
    await expect(page.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", /\/upgrade\/?$/);
    await expect(page.getByRole("button", { name: "Pro checkout unavailable" })).toBeDisabled();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.goto("/account/stats");
  await expect(page.getByRole("heading", { name: /Your saved stats/i })).toBeVisible();
  await expect(page.getByText(/Practice warm-ups are kept out of the permanent local record for now/i)).toBeVisible();
  await expect(page.locator(".player-stats-panel")).toContainText("No saved games yet");
  if (emailSignInAvailable) {
    await expect(page.getByText(/Create a free account to save your streak/i)).toBeVisible();
  } else {
    await expect(page.getByText(/Email sign-in is unavailable in this preview/i)).toBeVisible();
  }
  await expect(page.getByText(/Deeper reads are coming/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Supabase|magic link|SQL|PKCE|webhook|Edge Function|configured/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.goto("/upgrade");
  await expect(page.getByRole("heading", { name: /Unlock the full atlas/i })).toBeVisible();
  await expect(page.locator(".account-hero .lead")).toContainText(/Free lets you play the Daily/i);
  await expect(page.locator(".pro-price-options")).toContainText("$3.99");
  await expect(page.locator(".pro-price-options")).toContainText("/month");
  await expect(page.locator(".pro-price-options")).toContainText("$29.99");
  await expect(page.locator(".pro-price-options")).toContainText("/year");
  await expect(page.getByRole("link", { name: "Create a free account" }).first()).toHaveAttribute("href", /\/sign-in\/?$/);
  await expect(page.getByText(/Stripe handles payment details/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Supabase|webhook|Edge Function|configured|Production spine|You are on Guest|Billing stays server-side/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.goto("/auth/callback?error=server_error&error_description=PKCE%20code%20verifier%20not%20found");
  await expect(page.getByRole("heading", { name: /That sign-in link did not work/i })).toBeVisible();
  await expect(page.getByText(/expired or has already been used/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Send a new sign-in link/i })).toHaveAttribute("href", /\/sign-in\/?$/);
  await expect(page.locator("body")).not.toContainText(/PKCE|code verifier|Supabase/i);
});

test("past games page reads as player replay, not admin archive", async ({ page }) => {
  await page.goto("/archive/worldprint");
  await expect(page.locator(".archive-hero .eyebrow")).toHaveText("Past Games · Replay Library");
  await expect(page.getByRole("heading", { name: /Build your Mystery Map record book/i })).toBeVisible();
  await expect(page.getByText(/Each past date is a fixed 5-map set/i)).toBeVisible();
  await expect(page.getByText(/chase a better personal best/i)).toBeVisible();
  await expect(page.getByText(/Past Games are replays, not today's live Daily/i)).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Your stats" })).toContainText("No saved games yet");
  await expect(page.getByRole("complementary", { name: "Your stats" })).toContainText("Local on this device");
  await expect(page.getByRole("link", { name: "Play past map" }).first()).toBeVisible();
  await expect(page.getByText(/Full archive access is coming soon|Create a free account to save your progress/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/manifest|archive window|localStorage|generated data|content version|admin/i);
  await expect(page.locator("body")).not.toContainText("WORLDPRINT");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("past games header and nav are visible across breakpoints", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 720, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/archive/worldprint");
    await expect(page.getByRole("heading", { name: /Build your Mystery Map record book/i })).toBeVisible();
    await expect(page.locator(".archive-card")).toHaveCount(14);

    const brandLink = page.getByRole("link", { name: /Can You Geo\? home/i });
    await expect(brandLink).toBeVisible();
    await brandLink.click({ trial: true });

    const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
    for (const label of ["Play", "Past Games", "How it works"]) {
      const link = primaryNav.getByRole("link", { name: label });
      await expect(link).toBeVisible();
      await link.click({ trial: true });
    }

    await expectHeaderWithinViewport(page);
    await expectNoHorizontalOverflow(page);
  }
});

test("skill tiers change answer interface and clue support", async ({ page }) => {
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Explorer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Reveal unit: -100/i })).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Reveal unit: -100/i })).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Atlas Master").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await expect(page.locator(".choice-list .choice-button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Reveal unit: -100/i })).toBeVisible();
  await expect(page.getByLabel("Search playable map catalog")).toBeVisible();
});

test("mobile viewport has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can you read the world?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await startDaily(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset map view" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/how-to-play");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/about");
  await expect(page.getByRole("link", { name: /Read Data & Sources/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: /Real data, readable puzzles/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/legal");
  await expect(page.getByRole("heading", { name: /Terms & Privacy/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accessibility" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/archive/worldprint");
  await expect(page.getByRole("heading", { name: /Build your Mystery Map record book/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /Save your score and streak/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /Your atlas, saved/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/account/stats");
  await expect(page.getByRole("heading", { name: /Your saved stats/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.goto("/upgrade");
  await expect(page.getByRole("heading", { name: /Unlock the full atlas/i })).toBeVisible();
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
  await page.goto("/legal");
  await expect(page.getByRole("heading", { name: "Accessibility" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/sign-in");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/account");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/account/stats");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/upgrade");
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
  await page.getByRole("button", { name: /Start challenge/i }).click();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => window.localStorage.clear());

  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByRole("button", { name: /Pick practice maps/i }).click();
  await page.getByRole("button", { name: /Start practice/i }).click();
  await expect(page.getByText("Practice").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => window.localStorage.clear());

  await startDaily(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: correctLabel(0) }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("captures deterministic visual screenshots", async ({ page }, testInfo) => {
  const dir = path.join(artifactRoot, testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can you read the world?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow the signal." })).toBeVisible();
  await expect(page.locator(".game-loop-tile")).toHaveCount(3);
  await expect(page.locator(".mode-poster")).toHaveCount(3);
  await expect(page.getByTestId("cinematic-home-hero")).toBeVisible();
  await expect(page.locator(".fake-gameplay-stage")).toHaveCount(0);
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "landing.png"), fullPage: true });
  await page.screenshot({ path: path.join(dir, "landing-cinematic-hero.png"), fullPage: false });
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
  await page.goto("/sign-in");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "sign-in.png"), fullPage: true });
  await page.goto("/account");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "account.png"), fullPage: true });
  await page.goto("/account/stats");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "account-stats.png"), fullPage: true });
  await page.goto("/upgrade");
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "upgrade.png"), fullPage: true });
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
  await page.getByRole("button", { name: /Pick practice maps/i }).click();
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "tier-selection.png"), fullPage: true });
  await page.getByRole("button", { name: /Start practice/i }).click();
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
  const originalViewport = page.viewportSize();
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Explorer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  await countryPath(page, "MEX").hover();
  await page.screenshot({ path: path.join(dir, "tooltip-country.png"), fullPage: false });
  await page.locator("#country-search").selectOption({ label: "Bolivia" });
  await page.screenshot({ path: path.join(dir, "selected-country-card.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".selected-country-card").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(dir, "mobile-selected-country-panel.png"), fullPage: false });
  if (originalViewport) await page.setViewportSize(originalViewport);
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/play/worldprint?date=${TEST_DATE}`);
  await page.getByLabel("Cartographer").check();
  await page.getByRole("button", { name: /Start today's Mystery Map/i }).click();
  for (const label of wrongLabels(0, "cartographer").slice(0, 4)) {
    await page.getByRole("button", { name: label }).click();
  }
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "negative-score.png"), fullPage: false });
  await page.evaluate(() => window.localStorage.clear());
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
    await page.getByRole("button", { name: index === 2 ? /See results/ : /Next map/ }).click();
  }
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "challenge-complete.png"), fullPage: true });
  await page.goto(introPack.path);
  await page.getByRole("button", { name: /Start challenge/i }).click();
  for (let index = 0; index < introPack.roundIds.length; index += 1) {
    await page.getByRole("button", { name: correctLabelForRoundId(introPack.roundIds[index]) }).click();
    await page.getByRole("button", { name: index === introPack.roundIds.length - 1 ? /See results/ : /Next map/ }).click();
  }
  await scrollToTop(page);
  await page.screenshot({ path: path.join(dir, "beta-intro-pack-complete.png"), fullPage: true });
});
