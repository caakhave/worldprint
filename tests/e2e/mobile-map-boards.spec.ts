import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { encodeChallenge } from "../../src/lib/game/challenge";

type ViewportCase = {
  name: string;
  width: number;
  height: number;
};

const UNIT_CLUE_ROUND_ID = "worldprint-age-dependency";
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/v1/manifest.json"), "utf8")) as { contentVersion: string };
const MOBILE_VIEWPORTS: ViewportCase[] = [
  { name: "390px", width: 390, height: 844 },
  { name: "375px", width: 375, height: 812 }
];

async function clearLocalState(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth || document.body.scrollWidth > window.innerWidth
  );
  expect(hasOverflow).toBe(false);
}

async function expectCompactMobileHeader(page: Page) {
  const header = page.locator(".site-header");
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  const viewport = page.viewportSize();

  expect(headerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(headerBox!.height).toBeLessThan(130);
  expect(headerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
}

async function expectVisibleMapBoard(page: Page, boardTestId: string) {
  const board = page.getByTestId(boardTestId);
  const frame = board.locator(".map-frame");
  const map = board.locator(".world-map");
  const actionDock = board.locator(".play-action-dock");
  const header = page.locator(".site-header");

  await expect(board).toBeVisible();
  await expect(frame).toBeVisible();
  await expect(map).toBeVisible();

  const frameBox = await frame.boundingBox();
  const mapBox = await map.boundingBox();
  const actionDockBox = await actionDock.boundingBox();
  const headerBox = await header.boundingBox();

  expect(frameBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(actionDockBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(frameBox!.width).toBeGreaterThan(300);
  expect(frameBox!.height).toBeGreaterThan(200);
  expect(mapBox!.width).toBeGreaterThan(300);
  expect(mapBox!.height).toBeGreaterThan(200);
  expect(frameBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  expect(actionDockBox!.y).toBeGreaterThanOrEqual(frameBox!.y + frameBox!.height - 1);
  await expectNoHorizontalOverflow(page);
}

function atlasMasterChallengePath() {
  const code = encodeChallenge({
    kind: "practice",
    contentVersion: manifest.contentVersion,
    tier: "atlasMaster",
    roundIds: [UNIT_CLUE_ROUND_ID]
  });
  return `/challenge/mystery-map?c=${code}`;
}

for (const viewport of MOBILE_VIEWPORTS) {
  test(`Mystery Map sample keeps the map board visible on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto("/play/mystery-map/");
    await page.getByLabel("Analyst").check();
    await page.getByRole("button", { name: /Try the 5-map Sample Run/i }).click();
    await page.getByLabel("First run intro").getByRole("button", { name: "Start map 1" }).click();
    await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();

    await expectCompactMobileHeader(page);
    await expectVisibleMapBoard(page, "mystery-map-board");

    await page.locator('.country-path[data-iso3="CAN"]').first().tap();
    await expect(page.locator('.country-path[data-iso3="CAN"]').first()).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("country-evidence-panel")).toContainText("Selected country");
    await expect(page.getByTestId("country-evidence-panel")).toContainText("Canada");
    await expect(page.getByTestId("country-evidence-panel")).not.toContainText("Pick a country");
    await expect(page.getByTestId("country-value-evidence-panel")).toContainText("Selected: Canada");
    await expect(page.getByTestId("country-value-evidence-panel").getByRole("button", { name: /Reveal Canada's value/i })).toBeVisible();
    await expect(page.getByTestId("indicator-answer-panel")).toBeVisible();

    const selectedSummaryBox = await page.getByTestId("country-evidence-panel").boundingBox();
    const countryValueBox = await page.getByTestId("country-value-evidence-panel").boundingBox();
    const answerPanelBox = await page.getByTestId("indicator-answer-panel").boundingBox();
    expect(selectedSummaryBox).not.toBeNull();
    expect(countryValueBox).not.toBeNull();
    expect(answerPanelBox).not.toBeNull();
    expect(countryValueBox!.y).toBeGreaterThanOrEqual(selectedSummaryBox!.y + selectedSummaryBox!.height - 1);
    expect(answerPanelBox!.y).toBeGreaterThanOrEqual(countryValueBox!.y + countryValueBox!.height - 1);
    await expectNoHorizontalOverflow(page);
  });

  test(`Atlas Master catalog search shows tappable suggestions on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto(atlasMasterChallengePath());
    await page.getByRole("button", { name: /Play the challenge/i }).click();
    await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();
    await expectCompactMobileHeader(page);

    const search = page.getByLabel("Search playable map catalog");
    await search.fill("age");
    await expect(page.getByTestId("atlas-master-suggestions")).toBeVisible();
    await expect(page.getByRole("option", { name: /Age dependency ratio/i })).toBeVisible();
    await page.getByRole("option", { name: /Age dependency ratio/i }).tap();
    await expect(search).toHaveValue("Age dependency ratio");
    await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test(`Pattern Atlas sample keeps the highlighted map board visible on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto("/play/pattern-atlas/");
    await page.getByRole("button", { name: /Start sample run/i }).click();
    await expect(page.getByRole("heading", { name: /What pattern connects these countries/i })).toBeVisible();

    await expectCompactMobileHeader(page);
    await expectVisibleMapBoard(page, "pattern-atlas-board");
  });
}
