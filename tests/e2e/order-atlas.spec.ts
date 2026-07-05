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

async function expectActiveOrderAtlasRound(page: Page) {
  await expect(page.getByRole("heading", { name: "Move the cards into order." })).toBeVisible();
  await expect(page.getByText("Value hidden").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit order" })).toBeVisible();
  await expect(page.getByText("You finished the Order Atlas sample.")).not.toBeVisible();
}

async function completeOrderAtlasSample(page: Page) {
  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    await page.getByRole("button", { name: "Submit order" }).click();
    await expect(page.getByRole("heading", { name: /points$/ }).first()).toBeVisible();
    await page.getByRole("button", { name: roundIndex === 2 ? "Open results" : "Next round" }).first().click();
  }
}

for (const viewport of MOBILE_VIEWPORTS) {
  test(`Order Atlas sample restart starts playable round after stored completion on ${viewport.name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearLocalState(page);
    await page.goto("/play/order-atlas/");

    await page.getByRole("button", { name: /Start sample run/i }).click();
    await expectActiveOrderAtlasRound(page);
    await expectNoHorizontalOverflow(page);

    await completeOrderAtlasSample(page);

    const resultsTop = page.getByTestId("order-atlas-results-top");
    await expect(resultsTop).toBeVisible();
    await expect(resultsTop).toBeInViewport();
    await expect(page.getByText("You finished the Order Atlas sample.")).toBeVisible();

    await page.getByRole("button", { name: "Back to game options" }).click();
    await expect(page.getByRole("button", { name: /Play sample again/i })).toBeVisible();
    await page.getByRole("button", { name: /Play sample again/i }).click();

    await expectActiveOrderAtlasRound(page);
    await expectNoHorizontalOverflow(page);
  });
}

test("Order Atlas sample restart starts playable round after stored completion on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await clearLocalState(page);
  await page.goto("/play/order-atlas/");

  await page.getByRole("button", { name: /Start sample run/i }).click();
  await expectActiveOrderAtlasRound(page);
  await expectNoHorizontalOverflow(page);

  await completeOrderAtlasSample(page);

  const resultsTop = page.getByTestId("order-atlas-results-top");
  await expect(resultsTop).toBeVisible();
  await expect(resultsTop).toBeInViewport();

  await page.getByRole("button", { name: "Back to game options" }).click();
  await page.getByRole("button", { name: /Play sample again/i }).click();

  await expectActiveOrderAtlasRound(page);
  await expectNoHorizontalOverflow(page);
});
