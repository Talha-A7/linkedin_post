import type { Page, Route } from "@playwright/test";
import { test, expect, appAlert } from "../fixtures/test";
import { POST_FIXTURE } from "../fixtures/data";
import { PostComposerPage } from "../pages/PostComposerPage";

const SAVED = { offer: "my free 30-page guide", url: "https://example.com/guide", linkInBody: false };

/** Mocks /api/settings so UI tests don't share state through the seeded guest's real settings row. */
async function mockSettings(page: Page, initial: typeof SAVED | null, onPut?: (body: unknown, route: Route) => Promise<void>) {
  let current = initial;
  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { cta: current } });
    const body = JSON.parse(route.request().postData() ?? "{}");
    if (onPut) return onPut(body, route);
    current = body.offer ? body : null;
    return route.fulfill({ json: { cta: current } });
  });
}

test.describe("My CTA (P-1): composer card", () => {
  test("empty state → add → save → shown with the include box ticked", async ({ page, pageErrors }) => {
    await mockSettings(page, null);
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Add my CTA" }).click();
    const save = page.getByRole("button", { name: "Save", exact: true });
    await page.getByLabel("What do you offer?").fill("ab");
    await expect(save).toBeDisabled();
    await page.getByLabel("What do you offer?").fill(SAVED.offer);
    await page.getByLabel(/^Link/).fill(SAVED.url);
    await save.click();
    const include = page.getByRole("checkbox", { name: /End this post with my call to action/ });
    await expect(include).toBeChecked();
    await expect(page.getByText(`${SAVED.offer} · link in the first comment`)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("link placement choice is saved", async ({ page }) => {
    let sent: Record<string, unknown> = {};
    await mockSettings(page, null, async (body, route) => { sent = body as Record<string, unknown>; await route.fulfill({ json: { cta: body } }); });
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Add my CTA" }).click();
    await page.getByLabel("What do you offer?").fill(SAVED.offer);
    await page.getByLabel(/^Link/).fill(SAVED.url);
    await page.getByLabel("Link in the post").check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/link in the post/)).toBeVisible();
    expect(sent).toMatchObject({ offer: SAVED.offer, url: SAVED.url, linkInBody: true });
  });

  test("includeCta is sent when ticked and not sent when unticked", async ({ page, api }) => {
    await mockSettings(page, SAVED);
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await expect(page.getByRole("checkbox", { name: /End this post with my call to action/ })).toBeChecked();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[0].postData!).includeCta).toBe(true);

    await page.getByRole("button", { name: "← Edit scenario" }).click();
    await page.getByRole("checkbox", { name: /End this post with my call to action/ }).uncheck();
    await c.generateBtn().click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[1].postData!).includeCta).toBe(false);
  });

  test("with no saved CTA, includeCta is false", async ({ page, api }) => {
    await mockSettings(page, null);
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await expect(page.getByRole("button", { name: "Add my CTA" })).toBeVisible();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[0].postData!).includeCta).toBe(false);
  });

  test("meeting mode sends includeCta too", async ({ page, api }) => {
    await mockSettings(page, SAVED);
    const step1 = await api.capture("/api/meeting");
    const step2 = await api.capture("/api/meeting/posts");
    await page.goto("/posts/new?mode=meeting");
    await expect(page.getByRole("checkbox", { name: /End this post with my call to action/ })).toBeChecked();
    await page.getByRole("button", { name: "Paste the text instead" }).click();
    await page.getByLabel("Transcript text").fill("Jane: We cut onboarding from six weeks to five days by removing three steps. ".repeat(4));
    await page.getByRole("button", { name: "I'm the CEO / founder" }).click();
    await page.getByRole("button", { name: /Summarise meeting/ }).click();
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(step1[0].postData).toMatch(/name="includeCta"\r?\n\r?\ntrue/);
    expect(JSON.parse(step2[0].postData!).includeCta).toBe(true);
  });

  test("Edit → Remove clears the CTA", async ({ page }) => {
    await mockSettings(page, SAVED);
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByLabel("What do you offer?")).toHaveValue(SAVED.offer);
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("button", { name: "Add my CTA" })).toBeVisible();
  });

  test("Cancel keeps the saved CTA unchanged", async ({ page }) => {
    await mockSettings(page, SAVED);
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("What do you offer?").fill("something else");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(`${SAVED.offer} · link in the first comment`)).toBeVisible();
  });

  test("a server validation error is shown and the form stays open", async ({ page }) => {
    await mockSettings(page, null, (_b, route) => route.fulfill({ status: 400, json: { error: "Enter a full link starting with https://" } }));
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Add my CTA" }).click();
    await page.getByLabel("What do you offer?").fill(SAVED.offer);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(appAlert(page)).toContainText("https://");
    await expect(page.getByLabel("What do you offer?")).toBeVisible();
  });

  test("saving while offline shows the offline message", async ({ page }) => {
    await mockSettings(page, null, (_b, route) => route.abort("internetdisconnected"));
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Add my CTA" }).click();
    await page.getByLabel("What do you offer?").fill(SAVED.offer);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(appAlert(page)).toContainText(/offline|connection/i);
  });

  test("if settings fail to load, the composer still works", async ({ page }) => {
    await page.route("**/api/settings", (r) => r.fulfill({ status: 500, json: { error: "x" } }));
    const c = new PostComposerPage(page);
    await c.open();
    await expect(page.getByRole("button", { name: "Add my CTA" })).toBeVisible();
    await c.scenario().fill("A founder came to me 3 weeks before their raise with a Canva logo.");
    await expect(c.generateBtn()).toBeEnabled();
  });

  test("the 'Why?' popup explains the audit finding", async ({ page }) => {
    await mockSettings(page, null);
    await new PostComposerPage(page).open();
    await page.getByRole("button", { name: "Help: Why one call to action?" }).click();
    await expect(page.getByRole("dialog", { name: "Why one call to action?" })).toContainText("first comment");
  });
});

test.describe("Result notes (P-1, P-2)", () => {
  test("promotion and CTA notes appear when the server reports them", async ({ page }) => {
    await page.route("**/api/settings", (r) => r.fulfill({ json: { cta: null } }));
    await page.route("**/api/posts", (r) => r.fulfill({ json: { id: "x", result: { ...POST_FIXTURE, promo_story_first: true, cta_used: true } } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Promotion detected:")).toBeVisible();
    await expect(page.getByText(/kept the offer to the last lines/)).toBeVisible();
    await expect(page.getByText("🔗 Your call to action")).toBeVisible();
  });

  test("no notes for a normal post", async ({ page }) => {
    await page.route("**/api/settings", (r) => r.fulfill({ json: { cta: null } }));
    await page.route("**/api/posts", (r) => r.fulfill({ json: { id: "x", result: POST_FIXTURE } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await expect(page.getByText("Promotion detected:")).toHaveCount(0);
  });
});

test.describe("Number Paradox formula (P-5)", () => {
  test("is offered as F21 and suggested for comments, reposts and leads, not likes", async ({ page }) => {
    await page.route("**/api/settings", (r) => r.fulfill({ json: { cta: null } }));
    const c = new PostComposerPage(page);
    await c.open();
    const suggested = c.formula().locator('optgroup[label="Suggested for this goal"] option', { hasText: "Number Paradox" });
    for (const goal of ["Comments", "Reposts", "Leads"]) {
      await page.getByRole("radio", { name: new RegExp(goal) }).click();
      await expect(suggested).toHaveCount(1);
    }
    await page.getByRole("radio", { name: /Likes/ }).click();
    await expect(suggested).toHaveCount(0);
    await c.formula().selectOption("F21");
    await expect(c.formula()).toHaveValue("F21");
  });
});

// Real endpoint + real database (seeded guest). Serial so the guest's single settings row isn't raced.
test.describe("/api/settings (real)", () => {
  test.describe.configure({ mode: "serial" });

  test("rejects invalid input", async ({ request }) => {
    for (const [body, msg] of [
      [{ offer: "guide", url: "not-a-link" }, /https:\/\//],
      [{ offer: "guide", url: "javascript:alert(1)" }, /https:\/\//],
      [{ offer: "x".repeat(201) }, /200 characters/],
      [{ offer: "", url: "https://example.com" }, /what you're offering/],
    ] as const) {
      const res = await request.put("/api/settings", { data: body });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(msg);
    }
  });

  test("saves, reads back, and removes the CTA", async ({ request }) => {
    const put = await request.put("/api/settings", { data: SAVED });
    expect(put.status()).toBe(200);
    expect((await (await request.get("/api/settings")).json()).cta).toEqual(SAVED);

    const cleared = await request.put("/api/settings", { data: { offer: "", url: "", linkInBody: false } });
    expect((await cleared.json()).cta).toBeNull();
    expect((await (await request.get("/api/settings")).json()).cta).toBeNull();
  });
});
