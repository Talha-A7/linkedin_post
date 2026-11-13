import { test, expect, seed } from "../fixtures/test";
import { POST_FIXTURE } from "../fixtures/data";
import { PostComposerPage, VALID_SCENARIO } from "../pages/PostComposerPage";

test.describe("Post composer: form", () => {
  test("Generate needs at least 20 characters (ignoring spaces at the ends)", async ({ page, pageErrors }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await expect(c.generateBtn()).toBeDisabled();
    await c.scenario().fill("too short");
    await expect(c.generateBtn()).toBeDisabled();
    await c.scenario().fill("   short but padded      ");
    await expect(c.generateBtn()).toBeDisabled();
    await c.scenario().fill(VALID_SCENARIO);
    await expect(c.generateBtn()).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });

  test("example buttons fill the scenario", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Example 3" }).click();
    await expect(c.scenario()).toHaveValue(/\$873\.47/);
  });

  test("goal changes the suggested formulas and resets the formula to Auto", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("radio", { name: /Saves/ }).click();
    await expect(c.formula().locator('optgroup[label="Suggested for this goal"] option', { hasText: "Explain-to-Kids" })).toHaveCount(1);
    await c.formula().selectOption({ label: "Explain-to-Kids: Demystifying jargon" });
    await expect(c.formula()).toHaveValue("F15");
    await page.getByRole("radio", { name: /Likes/ }).click();
    await expect(c.formula()).toHaveValue("auto");
    await expect(c.formula().locator('optgroup[label="Suggested for this goal"] option', { hasText: "Emotional Cold-Open" })).toHaveCount(1);
  });

  test("length and tone chips are single-select", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("radio", { name: "Long" }).click();
    await expect(page.getByRole("radio", { name: "Long" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Medium" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("radio", { name: "Bold & direct" }).click();
    await expect(page.getByRole("radio", { name: "Story-driven" })).toHaveAttribute("aria-checked", "false");
  });

  test("'Make it sound like me' expands and collapses", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    const toggle = page.getByRole("button", { name: /Make it sound like me/ });
    await toggle.click();
    await expect(page.getByPlaceholder(/Paste your past posts/)).toBeVisible();
    await toggle.click();
    await expect(page.getByPlaceholder(/Paste your past posts/)).toHaveCount(0);
  });

  test("ⓘ help popups for goal and formula open", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open();
    await page.getByRole("button", { name: "Help: Why pick a goal?" }).click();
    await expect(page.getByRole("dialog", { name: "Why pick a goal?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Help: What's a hook formula?" }).click();
    await expect(page.getByRole("dialog", { name: "What's a hook formula?" })).toContainText("Auto");
  });

  test("sends every choice to the API", async ({ page, api }) => {
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.audience().fill("SaaS founders");
    await page.getByRole("radio", { name: /Saves/ }).click();
    await c.formula().selectOption("F7");
    await page.getByRole("radio", { name: "Short" }).click();
    await page.getByRole("radio", { name: "Professional" }).click();
    await page.getByRole("button", { name: /Make it sound like me/ }).click();
    await page.getByPlaceholder(/Paste your past posts/).fill("my old post");
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[0].postData!)).toMatchObject({
      scenario: VALID_SCENARIO, audience: "SaaS founders", goal: "saves", formula: "F7", length: "short", tone: "professional", voiceSamples: "my old post",
    });
  });

  test("pre-fill from an audit; an invalid audit id is ignored", async ({ page }) => {
    const c = new PostComposerPage(page);
    await c.open(`?audit=${seed().auditId}`);
    await expect(c.audience()).toHaveValue("Seed-stage SaaS founders");
    await c.open("?audit=not-a-uuid");
    await expect(c.audience()).toHaveValue("");
    await expect(page.getByText("Taken from your audit")).toHaveCount(0);
  });
});

test.describe("Post composer: result", () => {
  test.beforeEach(async ({ page, api }) => {
    await api.succeed("/api/posts", 2500);
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Picking the best hook formula…")).toBeVisible();
    await expect(page.getByText("Pick your hook")).toBeVisible();
  });

  test("shows formula, hooks, preview, placeholders, check, comment, visual and timing", async ({ page, pageErrors }) => {
    await expect(page.getByText(`Formula: ${POST_FIXTURE.formula!.name}`)).toBeVisible();
    for (const h of POST_FIXTURE.hooks) await expect(page.getByRole("button", { name: new RegExp(h.text.slice(0, 20)) })).toBeVisible();
    await expect(page.getByText("Fill in before posting: [deliverable]")).toBeVisible();
    await expect(page.getByText("reads human")).toBeVisible();
    await expect(page.getByText(POST_FIXTURE.first_comment)).toBeVisible();
    await expect(page.getByText(POST_FIXTURE.visual)).toBeVisible();
    await expect(page.getByText(POST_FIXTURE.best_time)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("the human-sounding check expands to list the fixes", async ({ page }) => {
    await page.getByText("Human-sounding check").click();
    await expect(page.getByText("E2E staccato run")).toBeVisible();
  });

  test("picking another hook swaps the post's first line", async ({ page }) => {
    const preview = page.locator("p.whitespace-pre-wrap").first();
    await expect(preview).toContainText(POST_FIXTURE.hooks[0].text);
    await page.getByRole("button", { name: new RegExp(POST_FIXTURE.hooks[1].text.slice(0, 20)) }).click();
    await expect(preview).toContainText(POST_FIXTURE.hooks[1].text);
    await expect(preview).not.toContainText(POST_FIXTURE.hooks[0].text);
  });

  test("copy post copies the currently selected version", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: new RegExp(POST_FIXTURE.hooks[2].text.slice(0, 20)) }).click();
    await page.locator("section", { hasText: "Your post" }).getByRole("button", { name: "Copy" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.startsWith(POST_FIXTURE.hooks[2].text)).toBe(true);
  });

  test("'Edit scenario' returns to the form with the text kept", async ({ page }) => {
    await page.getByRole("button", { name: "← Edit scenario" }).click();
    await expect(page.getByLabel(/What happened\?/)).toHaveValue(VALID_SCENARIO);
  });

  test("'Try another version' calls the API again", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (r.url().endsWith("/api/posts")) calls++; });
    await page.getByRole("button", { name: /Try another version/ }).click();
    await expect(page.getByRole("button", { name: /Writing…/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Try another version/ })).toBeVisible();
    expect(calls).toBe(1);
  });
});

test.describe("Post composer: failures", () => {
  const cases: [string, Parameters<import("../fixtures/test").ApiMock["fail"]>[1], RegExp][] = [
    ["400 validation", { kind: "status", status: 400, body: { error: "Describe your scenario in at least a couple of sentences." } }, /couple of sentences/],
    ["401 expired session", { kind: "status", status: 401, body: { error: "Please sign in." } }, /sign in/i],
    ["429 busy", { kind: "status", status: 429, body: { error: "We're busy right now." } }, /busy/],
    ["500 server error", { kind: "status", status: 500, body: { error: "Something went wrong. Please try again." } }, /went wrong/],
    ["504 HTML (non-JSON)", { kind: "html", status: 504 }, /went wrong|try again/i],
    ["dropped connection / offline", { kind: "abort" }, /internet|connection|network/i],
  ];
  for (const [name, failure, message] of cases) {
    test(`${name}: shows an error and keeps the scenario`, async ({ page, api, pageErrors }) => {
      await api.fail("/api/posts", failure);
      const c = new PostComposerPage(page);
      await c.open();
      await c.fillAndGenerate();
      await expect(c.alert()).toContainText(message);
      await expect(c.scenario()).toHaveValue(VALID_SCENARIO);
      await expect(c.generateBtn()).toBeEnabled();
      expect(pageErrors).toEqual([]);
    });
  }

  test("'Try another version' failure keeps the previous post visible", async ({ page, api }) => {
    await api.succeed("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await api.reset("/api/posts");
    await api.fail("/api/posts", { kind: "status", status: 500 });
    await page.getByRole("button", { name: /Try another version/ }).click();
    await expect(c.alert()).toBeVisible();
    await expect(page.getByText("Pick your hook")).toBeVisible();
  });
});


test.describe("Post composer: quick questions before writing (change 4)", () => {
  const QUESTIONS = [
    { question: "What made you take the project with only 3 weeks to go?", why: "Adds your reason" },
    { question: "What did the investors actually say?", why: "Makes the proof concrete" },
  ];

  test("asks up to 2 questions; answers are sent with the post", async ({ page, api }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ json: { questions: QUESTIONS } }));
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByRole("heading", { name: /Before we write: quick questions/ })).toBeVisible();
    await expect(page.getByText("Adds your reason")).toBeVisible();
    await page.getByLabel(QUESTIONS[0].question).fill("Their raise depended on looking credible.");
    await page.getByRole("button", { name: "Write my post ✨" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    // Only answered questions are sent.
    expect(JSON.parse(calls[0].postData!).answers).toEqual([{ question: QUESTIONS[0].question, answer: "Their raise depended on looking credible." }]);
  });

  test("'Skip and write' sends no answers", async ({ page, api }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ json: { questions: QUESTIONS } }));
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await page.getByLabel(QUESTIONS[0].question).fill("ignored");
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[0].postData!).answers).toEqual([]);
  });

  test("'← Back' returns to the form with the scenario kept", async ({ page }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ json: { questions: QUESTIONS } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await page.getByRole("button", { name: "← Back" }).click();
    await expect(c.scenario()).toHaveValue(VALID_SCENARIO);
  });

  test("no questions: writes straight away", async ({ page, api }) => {
    await api.succeed("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await expect(page.getByRole("heading", { name: /quick questions/ })).toHaveCount(0);
  });

  test("if the questions step fails, it still writes the post (questions are optional)", async ({ page, api }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ status: 503, json: { error: "x" } }));
    await api.succeed("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
  });

  test("an expired session on the questions step shows 'Please sign in'", async ({ page }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ status: 401, json: { error: "Please sign in." } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(c.alert()).toContainText("Please sign in");
  });

  test("'Try another version' reuses the answers without asking again", async ({ page, api }) => {
    let asked = 0;
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => { asked++; return r.fulfill({ json: { questions: QUESTIONS.slice(0, 1) } }); });
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await page.getByLabel(QUESTIONS[0].question).fill("my reason");
    await page.getByRole("button", { name: "Write my post ✨" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await page.getByRole("button", { name: /Try another version/ }).click();
    await expect.poll(() => calls.length).toBe(2);
    expect(asked).toBe(1);
    expect(JSON.parse(calls[1].postData!).answers).toEqual([{ question: QUESTIONS[0].question, answer: "my reason" }]);
  });
});

test.describe("Post result: payoff and labels (changes 5 and 6)", () => {
  test("shows 'What the reader gets' when present", async ({ page }) => {
    await page.route((u) => u.pathname === "/api/posts", (r) => r.fulfill({ json: { id: "x", result: { ...POST_FIXTURE, reader_payoff: "E2E: a move founders can copy." } } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("What the reader gets:")).toBeVisible();
    await expect(page.getByText("E2E: a move founders can copy.")).toBeVisible();
  });

  test("a template (non-formula) shows an icon badge and 'Structure', and hook labels aren't duplicated", async ({ page }) => {
    const result = {
      ...POST_FIXTURE,
      formula: { code: "Story template", name: "Story Post", why: "No formula fits." },
      hooks: [{ pattern: "Story template", text: "E2E template hook" }, ...POST_FIXTURE.hooks.slice(1)],
    };
    await page.route((u) => u.pathname === "/api/posts", (r) => r.fulfill({ json: { id: "x", result } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Structure: Story Post")).toBeVisible();
    await expect(page.getByText("✍️")).toBeVisible();
    await expect(page.getByText(/Story template · Story template/i)).toHaveCount(0);
  });

  test("the Copy button never wraps onto two lines", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/posts/${seed().meetingPostId}`);
    const copy = page.locator("details", { hasText: "Meeting summary" }).getByRole("button", { name: "Copy" });
    const box = await copy.boundingBox();
    expect(box!.height).toBeLessThan(32); // one line of text
  });
});

test.describe("Create new post", () => {
  test("clears the scenario but keeps the user's preferences", async ({ page, api }) => {
    await api.succeed("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.audience().fill("SaaS founders");
    await page.getByRole("radio", { name: /Saves/ }).click();
    await page.getByRole("radio", { name: "Bold & direct" }).click();
    await c.fillAndGenerate();
    await expect(page.getByText("Your post is ready and saved to History.")).toBeVisible();
    await page.getByRole("button", { name: "＋ Create new post" }).first().click();
    await expect(c.scenario()).toHaveValue("");
    await expect(c.generateBtn()).toBeDisabled();
    await expect(c.audience()).toHaveValue("SaaS founders");
    await expect(page.getByRole("radio", { name: /Saves/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Bold & direct" })).toHaveAttribute("aria-checked", "true");
  });

  test("the bottom button does the same", async ({ page, api }) => {
    await api.succeed("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await page.getByRole("button", { name: "＋ Create new post" }).last().click();
    await expect(c.scenario()).toHaveValue("");
  });

  test("a new post after one with questions starts clean (no old answers sent)", async ({ page, api }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ json: { questions: [{ question: "Why?", why: "reason" }] } }));
    const calls = await api.capture("/api/posts");
    const c = new PostComposerPage(page);
    await c.open();
    await c.fillAndGenerate();
    await page.getByLabel("Why?").fill("old answer");
    await page.getByRole("button", { name: "Write my post ✨" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await page.getByRole("button", { name: "＋ Create new post" }).first().click();
    await c.fillAndGenerate("A brand new scenario about our second launch, with more than twenty characters.");
    await expect(page.getByLabel("Why?")).toHaveValue("");
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[1].postData!).answers).toEqual([]);
  });

  test("saved post page links to a new post; a saved meeting post links to meeting mode", async ({ page }) => {
    await page.goto(`/posts/${seed().postId}`);
    await page.getByRole("link", { name: "＋ Create new post" }).click();
    await page.waitForURL(/\/posts\/new$/);
    await page.goto(`/posts/${seed().meetingPostId}`);
    await page.getByRole("link", { name: "＋ Create new post" }).click();
    await page.waitForURL("**/posts/new?mode=meeting");
    await expect(page.getByRole("radio", { name: /A meeting transcript/ })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Questionnaires are always on top (normal posts)", () => {
  test("the quick questions appear at the top of the page, in view", async ({ page }) => {
    await page.route((u) => u.pathname === "/api/posts/questions", (r) => r.fulfill({ json: { questions: [{ question: "Why now?", why: "Adds your reason" }] } }));
    const c = new PostComposerPage(page);
    await c.open();
    await c.scenario().fill(VALID_SCENARIO);
    await c.generateBtn().scrollIntoViewIfNeeded(); // start from the bottom of the form
    await c.generateBtn().click();
    const heading = page.getByRole("heading", { name: /Before we write: quick questions/ });
    await expect(heading).toBeInViewport();
    await expect(page.locator("main section.card").first()).toContainText("quick questions");
  });
});
