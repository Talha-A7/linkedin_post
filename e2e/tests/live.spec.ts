import { test, expect } from "../fixtures/test";
import { AuditWizardPage } from "../pages/AuditWizardPage";
import { PostComposerPage, VALID_SCENARIO } from "../pages/PostComposerPage";

// Real Claude calls, no mocks. Skipped unless E2E_LIVE=1 (each run costs money).
test.describe("@live real AI", () => {
  test.setTimeout(240_000);

  test("@live PDF audit end to end", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.toReadyPersonalPdf();
    await w.runBtn().click();
    await page.waitForURL(/\/audit\/[0-9a-f-]{36}$/, { timeout: 200_000 });
    await expect(page.getByText("out of 100")).toBeVisible();
    await expect(page.getByText("Top 5 fixes, ranked by impact")).toBeVisible();
  });

  test("@live meeting transcript end to end (privacy kept)", async ({ page }) => {
    await page.goto("/posts/new?mode=meeting");
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/files/meeting.vtt");
    await page.getByRole("button", { name: "I ran this meeting" }).click();
    await page.getByRole("button", { name: /Summarise meeting/ }).click();
    await expect(page.getByText("Meeting summary")).toBeVisible({ timeout: 200_000 });
    const skip = page.getByRole("button", { name: "Skip and write" });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByText("Pick your hook")).toBeVisible({ timeout: 200_000 });
    const post = await page.locator("p.whitespace-pre-wrap").first().innerText();
    for (const secret of ["Northwind", "180", "Sara", "Omar", "Lina"]) expect(post, `post leaks "${secret}"`).not.toContain(secret);
  });

  test("@live post end to end", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate(VALID_SCENARIO);
    await expect(page.getByText("Pick your hook")).toBeVisible({ timeout: 200_000 });
    await expect(page.getByText(/reads human|mixed|reads AI/)).toBeVisible();
  });
});
