import { expect, test, type Page } from "@playwright/test";

type ViewportCase = {
  name: string;
  width: number;
  height: number;
};

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

for (const viewport of MOBILE_VIEWPORTS) {
  test(`Mystery Map sample keeps the map board visible on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto("/play/mystery-map/");
    await page.getByLabel("Analyst").check();
    await page.getByRole("button", { name: /Try the 5-map Sample Run/i }).click();
    await page.getByLabel("First run intro").getByRole("button", { name: "Start map 1" }).click();
    await expect(page.getByRole("heading", { name: /What does this map measure/i })).toBeVisible();

    await expectVisibleMapBoard(page, "mystery-map-board");
  });

  test(`Pattern Atlas sample keeps the highlighted map board visible on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto("/play/pattern-atlas/");
    await page.getByRole("button", { name: /Start sample run/i }).click();
    await expect(page.getByRole("heading", { name: /What pattern connects these countries/i })).toBeVisible();

    await expectVisibleMapBoard(page, "pattern-atlas-board");
  });
}
