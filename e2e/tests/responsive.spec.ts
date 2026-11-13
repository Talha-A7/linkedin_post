import { test, anonTest, expect, seed } from "../fixtures/test";
import type { Page } from "@playwright/test";
import { AuditWizardPage } from "../pages/AuditWizardPage";

/** Phone → desktop widths. */
const VIEWPORTS = [
  { name: "320 small phone", width: 320, height: 640 },
  { name: "360 Android", width: 360, height: 740 },
  { name: "375 iPhone SE", width: 375, height: 667 },
  { name: "390 iPhone 14", width: 390, height: 844 },
  { name: "414 large phone", width: 414, height: 896 },
  { name: "768 tablet portrait", width: 768, height: 1024 },
  { name: "1024 tablet landscape", width: 1024, height: 768 },
  { name: "1280 laptop", width: 1280, height: 800 },
  { name: "1440 desktop", width: 1440, height: 900 },
  { name: "1920 large desktop", width: 1920, height: 1080 },
];

/** No sideways scrolling, and nothing interactive pokes out past the right edge. */
async function expectFitsViewport(page: Page, label: string) {
  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflowX = document.documentElement.scrollWidth - vw;
    const offenders = [...document.querySelectorAll("button, a, input, textarea, select, h1, h2, p, pre, li")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!r.width || style.visibility === "hidden" || el.closest("dialog:not([open])")) return false;
        return r.right > vw + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" right=${Math.round(el.getBoundingClientRect().right)}`);
    return { vw, overflowX, offenders };
  });
  expect(report.overflowX, `${label}: page scrolls sideways by ${report.overflowX}px. Offenders: ${report.offenders.join("; ")}`).toBeLessThanOrEqual(1);
  expect(report.offenders, `${label}: elements outside the viewport`).toEqual([]);
}

async function snap(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

for (const vp of VIEWPORTS) {
  test.describe(`Responsive @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    anonTest("landing page", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: /Audit my profile, free/ })).toBeVisible();
      await expectFitsViewport(page, "landing");
      await snap(page, `landing-${vp.width}`);
    });

    test("audit wizard, all three steps", async ({ page }) => {
      const w = new AuditWizardPage(page);
      await w.open();
      await expectFitsViewport(page, "wizard step 1");
      await w.chooseType("Personal profile");
      await expectFitsViewport(page, "wizard step 2");
      await w.fillGoal();
      await w.uploadPdf();
      await expectFitsViewport(page, "wizard step 3");
      await snap(page, `wizard-step3-${vp.width}`);
    });

    test("ⓘ popup fits the screen", async ({ page }) => {
      await page.goto("/audit/new");
      await page.getByRole("button", { name: "Help: Find your profile link" }).click();
      const box = await page.getByRole("dialog").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
    });

    test("audit report", async ({ page }) => {
      await page.goto(`/audit/${seed().auditId}`);
      await expect(page.getByRole("heading", { name: "E2E Test Profile" })).toBeVisible();
      await expectFitsViewport(page, "report");
      await snap(page, `report-${vp.width}`);
    });

    test("post composer and result", async ({ page }) => {
      await page.goto("/posts/new");
      await expectFitsViewport(page, "composer");
      await page.goto(`/posts/${seed().postId}`);
      await expect(page.getByText("Pick your hook")).toBeVisible();
      await expectFitsViewport(page, "post result");
      await snap(page, `post-${vp.width}`);
    });

    test("meeting transcript form and saved meeting post", async ({ page }) => {
      await page.goto("/posts/new?mode=meeting");
      await expect(page.getByText("Drag your transcript here, or click to choose")).toBeVisible();
      await expectFitsViewport(page, "meeting form");
      await page.goto(`/posts/${seed().meetingPostId}`);
      await expect(page.getByText("Meeting summary")).toBeVisible();
      await expectFitsViewport(page, "saved meeting post");
      await snap(page, `meeting-${vp.width}`);
    });

    test("dashboard", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Your audits")).toBeVisible();
      await expectFitsViewport(page, "dashboard");
      await snap(page, `dashboard-${vp.width}`);
    });
  });
}
