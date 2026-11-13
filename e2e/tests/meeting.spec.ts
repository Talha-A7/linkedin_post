import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, seed, appAlert } from "../fixtures/test";
import { ANGLE_TWO_POST, MEETING_POST_FIXTURE, MEETING_SUMMARY } from "../fixtures/data";
import { FILES_DIR } from "../fixtures/paths";
import type { Page } from "@playwright/test";

const LONG_PASTE = "Jane: We cut onboarding from six weeks to five days by removing three steps nobody used. ".repeat(4);
const ROLE = "I'm the CEO / founder";

async function openMeetingMode(page: Page) {
  await page.goto("/posts/new?mode=meeting");
  await expect(page.getByRole("radio", { name: /A meeting transcript/ })).toHaveAttribute("aria-checked", "true");
}
const fileInput = (page: Page) => page.locator('input[type="file"]');
const submit = (page: Page) => page.getByRole("button", { name: /Summarise meeting/ });
const roleInput = (page: Page) => page.getByLabel(/Who's posting\?/);

/** Fills a ready-to-submit meeting form. */
async function readyForm(page: Page, file = "meeting.vtt") {
  await openMeetingMode(page);
  await fileInput(page).setInputFiles(path.join(FILES_DIR, file));
  await page.getByRole("button", { name: ROLE }).click();
}

const postPreview = (page: Page) => page.locator("p.whitespace-pre-wrap").first();

test.describe("Meeting transcript: form", () => {
  test("switching modes swaps the scenario box for the transcript upload", async ({ page, pageErrors }) => {
    await page.goto("/posts/new");
    await expect(page.getByLabel(/What happened\?/)).toBeVisible();
    await page.getByRole("radio", { name: /A meeting transcript/ }).click();
    await expect(page.getByLabel(/What happened\?/)).toHaveCount(0);
    await expect(page.getByText("Drag your transcript here, or click to choose")).toBeVisible();
    await expect(page.getByText(/Meetings are private, posts are public/)).toBeVisible();
    await page.getByRole("radio", { name: /Describe a moment/ }).click();
    await expect(page.getByLabel(/What happened\?/)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("?mode=meeting opens straight into meeting mode, and the dashboard card links there", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Post from a meeting/ }).click();
    await page.waitForURL("**/posts/new?mode=meeting");
    await expect(page.getByRole("radio", { name: /A meeting transcript/ })).toHaveAttribute("aria-checked", "true");
  });

  test("the 'Which files?' popup explains Zoom, Teams, Google Meet and Otter exports", async ({ page }) => {
    await openMeetingMode(page);
    await page.getByRole("button", { name: "Help: Which transcripts work?" }).click();
    const dialog = page.getByRole("dialog", { name: "Which transcripts work?" });
    for (const t of ["Zoom", "Google Meet", "Otter"]) await expect(dialog).toContainText(t);
  });

  test("'Who's posting?' is required (change 1)", async ({ page }) => {
    await openMeetingMode(page);
    await fileInput(page).setInputFiles(path.join(FILES_DIR, "meeting.vtt"));
    await expect(submit(page)).toBeDisabled();
    await roleInput(page).fill("x");
    await expect(submit(page)).toBeDisabled();
    await roleInput(page).fill("I'm the founder; I ran the call");
    await expect(submit(page)).toBeEnabled();
    await roleInput(page).fill("   ");
    await expect(submit(page)).toBeDisabled();
  });

  test("role chips fill 'Who's posting?'", async ({ page }) => {
    await openMeetingMode(page);
    await page.getByRole("button", { name: "I lead marketing" }).click();
    await expect(roleInput(page)).toHaveValue("I lead marketing");
  });

  test("submit stays disabled until a transcript is provided", async ({ page }) => {
    await openMeetingMode(page);
    await page.getByRole("button", { name: ROLE }).click();
    await expect(submit(page)).toBeDisabled();
    await fileInput(page).setInputFiles(path.join(FILES_DIR, "meeting.vtt"));
    await expect(page.locator("label:has(input[type=file])")).toContainText("meeting.vtt");
    await expect(submit(page)).toBeEnabled();
  });

  for (const name of ["meeting.vtt", "meeting.docx", "Profile.pdf", "notes.txt"]) {
    test(`accepts ${name}`, async ({ page }) => {
      await readyForm(page, name);
      await expect(appAlert(page)).toHaveCount(0);
      await expect(submit(page)).toBeEnabled();
    });
  }

  test("refuses an unsupported file type", async ({ page }) => {
    await openMeetingMode(page);
    await fileInput(page).setInputFiles(path.join(FILES_DIR, "picture.png"));
    await expect(appAlert(page)).toContainText(".vtt, .srt, .md, .docx or .pdf");
  });

  test("refuses a file over 8 MB", async ({ page }) => {
    await openMeetingMode(page);
    await fileInput(page).setInputFiles({ name: "huge.txt", mimeType: "text/plain", buffer: Buffer.alloc(8 * 1024 * 1024 + 1, 0x61) });
    await expect(appAlert(page)).toContainText("larger than 8 MB");
  });

  test("drag and drop a transcript", async ({ page }) => {
    await openMeetingMode(page);
    const zone = page.locator("label:has(input[type=file])");
    const dt = await page.evaluateHandle(() => {
      const d = new DataTransfer();
      d.items.add(new File(["WEBVTT\n\n00:00.000 --> 00:01.000\n<v A>Hi"], "dropped.vtt", { type: "text/vtt" }));
      return d;
    });
    // Retry until React has hydrated and attached its drag handlers.
    await expect(async () => {
      await zone.dispatchEvent("dragover", { dataTransfer: dt });
      await expect(page.getByText("Drop it here")).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 10_000 });
    await zone.dispatchEvent("drop", { dataTransfer: dt });
    await expect(zone).toContainText("dropped.vtt");
  });

  test("paste mode needs at least 200 characters and shows a counter", async ({ page }) => {
    await openMeetingMode(page);
    await page.getByRole("button", { name: ROLE }).click();
    await page.getByRole("button", { name: "Paste the text instead" }).click();
    const box = page.getByLabel("Transcript text");
    await box.fill("Jane: too short");
    await expect(page.getByText("At least 200 characters")).toBeVisible();
    await expect(submit(page)).toBeDisabled();
    await box.fill(LONG_PASTE);
    await expect(submit(page)).toBeEnabled();
  });

  test("step 1 sends the file, role, angle hint and post options as multipart", async ({ page, api }) => {
    const calls = await api.capture("/api/meeting");
    await readyForm(page);
    await page.getByLabel(/What should the post be about/).fill("the onboarding lesson");
    await page.getByLabel("Who should stop scrolling for this?").fill("SaaS founders");
    await page.getByRole("radio", { name: /Saves/ }).click();
    await submit(page).click();
    await expect(page.getByText("Meeting summary")).toBeVisible();
    expect(calls[0].multipart).toBe(true);
    for (const v of ["meeting.vtt", ROLE, "the onboarding lesson", "SaaS founders", "saves"]) expect(calls[0].postData).toContain(v);
  });
});

test.describe("Meeting transcript: summary and questions (change 4)", () => {
  test("shows the summary and asks only the angles that have a question", async ({ page, api }) => {
    await api.succeed("/api/meeting", 1500);
    await readyForm(page);
    await submit(page).click();
    await expect(page.getByText("Reading the transcript…")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Before we write 2 posts/ })).toBeVisible();
    await expect(page.getByText(MEETING_SUMMARY.title)).toBeVisible();
    await expect(page.getByLabel(MEETING_SUMMARY.post_angles[0].question)).toBeVisible();
    await expect(page.locator("textarea[id^=answer-]")).toHaveCount(1); // angle two has no question
    await expect(page.getByText("We'll write a post for each angle")).toBeVisible();
  });

  test("answers are sent with the summary, role and options to step 2", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    const calls = await api.capture("/api/meeting/posts");
    await readyForm(page);
    await submit(page).click();
    await page.getByLabel(MEETING_SUMMARY.post_angles[0].question).fill("The kickoff deck, because sales promised it.");
    await page.getByRole("button", { name: "Write the posts ✨" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    const body = JSON.parse(calls[0].postData!);
    expect(body.role).toBe(ROLE);
    expect(body.answers).toEqual(["The kickoff deck, because sales promised it.", ""]);
    expect(body.meeting.title).toBe(MEETING_SUMMARY.title);
  });

  test("'Skip and write' sends empty answers", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    const calls = await api.capture("/api/meeting/posts");
    await readyForm(page);
    await submit(page).click();
    await page.getByLabel(MEETING_SUMMARY.post_angles[0].question).fill("something");
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    expect(JSON.parse(calls[0].postData!).answers).toEqual(["", ""]);
  });

  test("no questions at all: goes straight to writing", async ({ page, api }) => {
    await page.route((u) => u.pathname === "/api/meeting", (r) =>
      r.fulfill({ json: { meeting: { ...MEETING_SUMMARY, post_angles: MEETING_SUMMARY.post_angles.map((a) => ({ ...a, question: "" })) } } }),
    );
    await api.succeed("/api/meeting/posts");
    await readyForm(page);
    await submit(page).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await expect(page.getByRole("heading", { name: /quick questions/ })).toHaveCount(0);
  });

  test("'← Back' from the questions returns to the form with everything kept", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await readyForm(page);
    await submit(page).click();
    await page.getByRole("button", { name: "← Back" }).click();
    await expect(page.locator("label:has(input[type=file])")).toContainText("meeting.vtt");
    await expect(roleInput(page)).toHaveValue(ROLE);
  });
});

test.describe("Meeting transcript: all angles written at once (change 3)", () => {
  test.beforeEach(async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await api.succeed("/api/meeting/posts", 1500);
    await readyForm(page);
    await submit(page).click();
    await page.getByRole("button", { name: "Write the posts ✨" }).click();
    await expect(page.getByText("Writing a post for each angle…")).toBeVisible();
    await expect(page.getByText("Pick your hook")).toBeVisible();
  });

  test("shows summary, privacy check, angles, payoff and the first post", async ({ page, pageErrors }) => {
    const m = MEETING_SUMMARY;
    await page.getByText("Show key points, decisions, action items and quotes").click();
    for (const t of [m.title, m.key_points[0], m.decisions[0], m.privacy_notes[0], m.post_angles[1].headline]) {
      await expect(page.getByText(t, { exact: false }).first()).toBeVisible();
    }
    await expect(page.getByText("Current post")).toBeVisible();
    await expect(page.getByText(/What the reader gets/)).toBeVisible();
    await expect(postPreview(page)).toContainText("onboarding went from 41 days to 6");
    expect(pageErrors).toEqual([]);
  });

  test("'Show this post' switches instantly, with no new API call", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (/\/api\/(posts|meeting)/.test(new URL(r.url()).pathname)) calls++; });
    await page.getByRole("button", { name: "Show this post" }).click();
    await expect(postPreview(page)).toContainText("eleven days waiting on legal");
    await expect(page.locator("li", { hasText: "E2E angle two" })).toContainText("Current post");
    await page.getByRole("button", { name: "Show this post" }).click();
    await expect(postPreview(page)).toContainText("onboarding went from 41 days to 6");
    expect(calls).toBe(0);
  });

  test("copy summary puts a readable summary on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator("details", { hasText: "Meeting summary" }).getByRole("button", { name: "Copy" }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain(MEETING_SUMMARY.title);
    expect(text).toContain("Action items:");
  });

  test("'Rewrite all angles' calls step 2 again", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (new URL(r.url()).pathname === "/api/meeting/posts") calls++; });
    await page.getByRole("button", { name: /Rewrite all angles/ }).click();
    await expect(page.getByRole("button", { name: /Rewrite all angles/ })).toBeVisible();
    expect(calls).toBe(1);
  });

  test("'Change transcript' returns to the form with the file still attached", async ({ page }) => {
    await page.getByRole("button", { name: "← Change transcript" }).click();
    await expect(page.locator("label:has(input[type=file])")).toContainText("meeting.vtt");
    await expect(submit(page)).toBeEnabled();
  });
});

test.describe("Meeting transcript: a failed angle", () => {
  test("an angle whose post failed can't be shown; the others still work", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await page.route((u) => u.pathname === "/api/meeting/posts", (r) =>
      r.fulfill({ json: { id: "x", result: { ...MEETING_POST_FIXTURE, angle_posts: [MEETING_POST_FIXTURE.angle_posts![0], null] } } }),
    );
    await readyForm(page);
    await submit(page).click();
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText(/Couldn't write this one/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Show this post" })).toHaveCount(0);
  });
});

test.describe("Meeting transcript: failures", () => {
  const cases: [string, Parameters<import("../fixtures/test").ApiMock["fail"]>[1], RegExp][] = [
    ["400 unreadable file", { kind: "status", status: 400, body: { error: "We couldn't read that Word document." } }, /couldn't read/],
    ["400 role missing", { kind: "status", status: 400, body: { error: "Tell us who's posting, so the post is written in your voice." } }, /who's posting/],
    ["401 expired session", { kind: "status", status: 401, body: { error: "Please sign in." } }, /sign in/i],
    ["503 service unavailable", { kind: "status", status: 503, body: { error: "The writing service is temporarily unavailable. Please try again later." } }, /temporarily unavailable/],
    ["504 HTML (non-JSON)", { kind: "html", status: 504 }, /went wrong|try again/i],
    ["offline / dropped connection", { kind: "abort" }, /offline|connection/i],
  ];
  for (const [name, failure, message] of cases) {
    test(`step 1 ${name}: shows an error and keeps the form`, async ({ page, api, pageErrors }) => {
      await api.fail("/api/meeting", failure);
      await readyForm(page);
      await submit(page).click();
      await expect(appAlert(page)).toContainText(message);
      await expect(page.locator("label:has(input[type=file])")).toContainText("meeting.vtt");
      await expect(submit(page)).toBeEnabled();
      expect(pageErrors).toEqual([]);
    });
  }

  test("step 2 failure keeps the questions and answers so you can retry", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await api.fail("/api/meeting/posts", { kind: "status", status: 503, body: { error: "The writing service is temporarily unavailable. Please try again later." } });
    await readyForm(page);
    await submit(page).click();
    await page.getByLabel(MEETING_SUMMARY.post_angles[0].question).fill("my answer");
    await page.getByRole("button", { name: "Write the posts ✨" }).click();
    await expect(appAlert(page)).toContainText("temporarily unavailable");
    await expect(page.getByLabel(MEETING_SUMMARY.post_angles[0].question)).toHaveValue("my answer");
    await api.reset("/api/meeting/posts");
    await api.succeed("/api/meeting/posts");
    await page.getByRole("button", { name: "Write the posts ✨" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
  });
});

test.describe("Saved meeting post", () => {
  test("shows the summary and every angle's post, switchable", async ({ page }) => {
    await page.goto(`/posts/${seed().meetingPostId}`);
    await expect(page.getByRole("heading", { name: MEETING_SUMMARY.title })).toBeVisible();
    await expect(postPreview(page)).toContainText("onboarding went from 41 days to 6");
    await page.getByRole("button", { name: "Show this post" }).click();
    await expect(postPreview(page)).toContainText(ANGLE_TWO_POST.post.slice(0, 30));
  });

  test("is marked with 🎙️ in History", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /🎙️ E2E meeting hook/ })).toBeVisible();
  });
});

test.describe("POST /api/meeting validation (no AI cost)", () => {
  const opts = { goal: "comments", tone: "story", length: "medium", formula: "auto", role: ROLE };
  const file = (name: string, buffer?: Buffer, mimeType = "application/octet-stream") => ({ name, mimeType, buffer: buffer ?? readFileSync(path.join(FILES_DIR, name)) });

  test("role is required", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, role: "", transcriptText: LONG_PASTE } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/who's posting/);
  });
  test("no transcript at all", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: opts });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/too short/);
  });
  test("pasted transcript over 200,000 characters", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, transcriptText: "a".repeat(200_001) } });
    expect((await res.json()).error).toMatch(/too long/);
  });
  test("unsupported extension", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("picture.png") } });
    expect((await res.json()).error).toMatch(/Upload a \.txt/);
  });
  test("binary file renamed to .txt", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("fake-transcript.txt") } });
    expect((await res.json()).error).toMatch(/doesn't look like text/);
  });
  test("text renamed to .pdf", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("renamed-text.pdf") } });
    expect((await res.json()).error).toMatch(/isn't a real PDF/);
  });
  test("text renamed to .docx", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("notes.docx", Buffer.from("not a zip")) } });
    expect((await res.json()).error).toMatch(/isn't a real Word document/);
  });
  test("file over 8 MB", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("big.txt", Buffer.alloc(8 * 1024 * 1024 + 1, 0x61)) } });
    expect((await res.json()).error).toMatch(/larger than 8 MB/);
  });
  test("upload far over the limit is refused before reading it", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("huge.txt", Buffer.alloc(12 * 1024 * 1024, 0x61)) } });
    expect(res.status()).toBe(413);
  });
  test("short .txt file", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, file: file("notes.txt") } });
    expect((await res.json()).error).toMatch(/too short/);
  });
  test("invalid post option", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { ...opts, goal: "virality", transcriptText: LONG_PASTE } });
    expect(res.status()).toBe(400);
  });
});

test.describe("POST /api/meeting/posts validation (no AI cost)", () => {
  const base = { goal: "comments", tone: "story", length: "medium", formula: "auto", role: ROLE, meeting: MEETING_SUMMARY };

  test("role is required", async ({ request }) => {
    const res = await request.post("/api/meeting/posts", { data: { ...base, role: "" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/who's posting/);
  });
  test("missing or malformed summary", async ({ request }) => {
    for (const meeting of [undefined, { title: "x" }, "not an object"]) {
      const res = await request.post("/api/meeting/posts", { data: { ...base, meeting } });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(/Summarise the transcript again/);
    }
  });
  test("a summary with no angles", async ({ request }) => {
    const res = await request.post("/api/meeting/posts", { data: { ...base, meeting: { ...MEETING_SUMMARY, post_angles: [] } } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/No post angles/);
  });
  test("too many answers", async ({ request }) => {
    const res = await request.post("/api/meeting/posts", { data: { ...base, answers: ["a", "b", "c", "d"] } });
    expect(res.status()).toBe(400);
  });
  test("not signed in", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    expect((await anon.post("/api/meeting/posts", { data: base })).status()).toBe(401);
    await anon.dispose();
  });
});

test.describe("Meeting: create new post", () => {
  test("clears the transcript and summary but keeps 'Who's posting?'", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await api.succeed("/api/meeting/posts");
    await readyForm(page);
    await submit(page).click();
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Your meeting posts are ready and saved to History.")).toBeVisible();
    await page.getByRole("button", { name: "＋ Create new post" }).first().click();
    await expect(page.getByText("Drag your transcript here, or click to choose")).toBeVisible();
    await expect(roleInput(page)).toHaveValue(ROLE);
    await expect(submit(page)).toBeDisabled();
    await expect(page.getByText("Meeting summary")).toHaveCount(0);
  });
});


test.describe("Meeting summary accordion", () => {
  const summaryBox = (page: Page) => page.locator("details", { hasText: "Meeting summary" });

  test("is closed by default; the title, privacy check and angles stay visible", async ({ page }) => {
    await page.goto(`/posts/${seed().meetingPostId}`);
    await expect(page.getByRole("heading", { name: MEETING_SUMMARY.title })).toBeVisible();
    await expect(summaryBox(page)).not.toHaveAttribute("open", "");
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeHidden();
    await expect(page.getByText(MEETING_SUMMARY.privacy_notes[0])).toBeVisible();
    await expect(page.getByText(MEETING_SUMMARY.post_angles[1].headline)).toBeVisible();
  });

  test("opens and closes on click", async ({ page }) => {
    await page.goto(`/posts/${seed().meetingPostId}`);
    await page.getByText("Show key points, decisions, action items and quotes").click();
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeVisible();
    await expect(page.getByText(MEETING_SUMMARY.action_items[0].task)).toBeVisible();
    await page.getByText("Hide summary").click();
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeHidden();
  });

  test("opens with the keyboard", async ({ page }) => {
    await page.goto(`/posts/${seed().meetingPostId}`);
    await summaryBox(page).locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeVisible();
  });

  test("Copy works without opening or closing it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/posts/${seed().meetingPostId}`);
    await summaryBox(page).getByRole("button", { name: "Copy" }).click();
    await expect(summaryBox(page).getByRole("button", { name: "Copied ✓" })).toBeVisible();
    await expect(summaryBox(page)).not.toHaveAttribute("open", "");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Key points:");
  });

  test("is also closed on the questions step and on a fresh result", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await api.succeed("/api/meeting/posts");
    await readyForm(page);
    await submit(page).click();
    await expect(page.getByText(MEETING_SUMMARY.title)).toBeVisible();
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeHidden();
    await page.getByRole("button", { name: "Skip and write" }).click();
    await expect(page.getByText("Pick your hook")).toBeVisible();
    await expect(page.getByText(MEETING_SUMMARY.key_points[0])).toBeHidden();
  });
});

test.describe("Questionnaires are always on top", () => {
  test("meeting questions come before the summary and are scrolled into view", async ({ page, api }) => {
    await api.succeed("/api/meeting");
    await readyForm(page);
    await submit(page).click(); // the button is at the bottom of a long form
    const questions = page.getByRole("heading", { name: /quick questions/ });
    const summary = page.getByText("Meeting summary", { exact: true });
    await expect(questions).toBeVisible();
    await expect(questions).toBeInViewport();
    const [q, sm] = [await questions.boundingBox(), await summary.boundingBox()];
    expect(q!.y).toBeLessThan(sm!.y);
    // The questionnaire is the first card in the composer.
    await expect(page.locator("main section.card").first()).toContainText("quick questions");
  });
});
