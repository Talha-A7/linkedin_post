import { test, expect, seed } from "../fixtures/test";
import { POST_FIXTURE } from "../fixtures/data";

test.describe("Dashboard (history)", () => {
  test("lists the guest's audits and posts with working links", async ({ page, pageErrors }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("You're using a guest session")).toBeVisible();
    const audit = page.getByRole("link", { name: /E2E Test Profile/ });
    await expect(audit).toContainText("42");
    await audit.click();
    await page.waitForURL(`**/audit/${seed().auditId}`);
    await page.goto("/dashboard");
    await page.getByRole("link", { name: new RegExp(POST_FIXTURE.hooks[0].text.slice(0, 20)) }).first().click();
    await page.waitForURL(`**/posts/${seed().postId}`);
    expect(pageErrors).toEqual([]);
  });

  test("start cards open the audit wizard and the composer", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Audit my profile or page/ }).click();
    await page.waitForURL("**/audit/new");
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Write a post Describe/ }).click();
    await page.waitForURL("**/posts/new");
  });

  test("header navigation works and shows the guest badge (no sign-out for guests)", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    const header = page.getByRole("banner");
    await expect(header.getByText("Guest", { exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    for (const [name, url] of [["Audit", "/audit/new"], ["Write a post", "/posts/new"], ["History", "/dashboard"]] as const) {
      await header.getByRole("link", { name, exact: true }).click();
      await page.waitForURL(`**${url}`);
    }
    await header.getByRole("link", { name: "Profile Pilot" }).click();
    await page.waitForURL("**/dashboard");
    void isMobile;
  });
});

test.describe("Saved post page", () => {
  test("shows the scenario and the saved post, with a link back", async ({ page }) => {
    await page.goto(`/posts/${seed().postId}`);
    await expect(page.getByText("E2E seeded scenario about a client rebrand.")).toBeVisible();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await page.getByRole("link", { name: "← Dashboard" }).click();
    await page.waitForURL("**/dashboard");
  });

  test("an unknown post id shows 404", async ({ page }) => {
    await page.goto("/posts/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("a malformed post id shows 404", async ({ page }) => {
    await page.goto("/posts/abc");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
