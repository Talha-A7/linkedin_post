import { test, expect, seed, appAlert } from "../fixtures/test";
import { AUDIT_FIXTURE } from "../fixtures/data";

test.describe("Audit report page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/audit/${seed().auditId}`);
    await expect(page.getByRole("heading", { name: "E2E Test Profile" })).toBeVisible();
  });

  test("renders every section of the report", async ({ page, pageErrors }) => {
    await expect(page.getByText("42", { exact: true })).toBeVisible();
    await expect(page.getByText(AUDIT_FIXTURE.headline_diagnosis)).toBeVisible();
    for (const s of AUDIT_FIXTURE.sections) await expect(page.getByText(s.verdict)).toBeVisible();
    await expect(page.getByText("verify", { exact: true })).toBeVisible(); // null score
    for (const f of AUDIT_FIXTURE.top_fixes) await expect(page.getByText(f.title).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "What's missing entirely" })).toBeVisible();
    await expect(page.getByText("brand identity", { exact: true })).toBeVisible();
    await expect(page.getByText("Whether a custom button is available")).toBeVisible();
    await expect(page.getByText("Banner text")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("character counters flag rewrites over LinkedIn's limit", async ({ page }) => {
    const ok = page.getByText(/^\d+ \/ 220$/).first();
    await expect(ok).toBeVisible();
    await expect(ok).not.toHaveClass(/text-bad/);
    const over = page.getByText(/^2\d\d \/ 220$/).filter({ hasText: /^2(2[1-9]|[3-9]\d)/ });
    await expect(over).toHaveClass(/text-bad/);
  });

  test("Copy puts the text on the clipboard and confirms", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const firstHeadline = AUDIT_FIXTURE.rewrites.headlines[0];
    const row = page.locator("li", { hasText: firstHeadline });
    await row.getByRole("button", { name: "Copy" }).click();
    await expect(row.getByRole("button", { name: "Copied ✓" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(firstHeadline);
  });

  test("Copy fails gracefully when the clipboard is blocked", async ({ page, pageErrors }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true });
    });
    await page.getByRole("button", { name: "Copy" }).first().click();
    await expect(page.getByRole("button", { name: /Copy failed/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("next-step checkboxes toggle", async ({ page }) => {
    const box = page.getByRole("checkbox", { name: "Change the headline today" });
    await box.check();
    await expect(box).toBeChecked();
    await box.uncheck();
    await expect(box).not.toBeChecked();
  });

  test("'Write a post →' opens the composer pre-filled from this audit", async ({ page }) => {
    await page.getByRole("link", { name: "Write a post →" }).click();
    await page.waitForURL(`**/posts/new?audit=${seed().auditId}`);
    await expect(page.getByLabel("Who should stop scrolling for this?")).toHaveValue("Seed-stage SaaS founders");
    await expect(page.getByText("Taken from your audit")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Leads/ })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Guest 'save your work' banner", () => {
  test("adding an email shows the confirmation", async ({ page }) => {
    await page.route("**/auth/v1/user**", (r) =>
      r.request().method() === "PUT" ? r.fulfill({ status: 200, json: { id: seed().userId, email: "qa@example.com", aud: "authenticated", role: "authenticated" } }) : r.continue(),
    );
    await page.goto(`/audit/${seed().auditId}`);
    await page.getByPlaceholder("you@company.com").fill("qa@example.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Check .*qa@example.com.* to confirm/)).toBeVisible();
  });

  test("an email that's already taken shows the error", async ({ page }) => {
    await page.route("**/auth/v1/user**", (r) =>
      r.request().method() === "PUT" ? r.fulfill({ status: 422, json: { code: 422, msg: "A user with this email address has already been registered" } }) : r.continue(),
    );
    await page.goto(`/audit/${seed().auditId}`);
    await page.getByPlaceholder("you@company.com").fill("taken@example.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(appAlert(page)).toContainText(/already been registered/);
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

test.describe("Missing audits", () => {
  test("an unknown audit id shows 404", async ({ page }) => {
    await page.goto("/audit/00000000-0000-4000-8000-000000000000");
    // Next 16 streams this page, so the HTTP status is 200; the user still sees the 404 page.
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("a malformed audit id shows 404, not a crash", async ({ page }) => {
    await page.goto("/audit/not-a-uuid");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
