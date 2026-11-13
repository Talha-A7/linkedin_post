// Records a demo of the real app (local dev server) as crisp 1920x1080 frames via Chrome's screencast,
// with a large visible cursor and timestamped marks for editing. Fictional sample data only.
//   node scripts/demo/record.mjs <outDir>
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "demo-recording");
const DEMO = path.resolve("scripts/demo");
mkdirSync(path.join(OUT, "frames"), { recursive: true });

const marks = [];
const mark = (name) => { marks.push({ name, t: Date.now() / 1000 }); console.log(`[mark] ${name}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "light", baseURL: "http://localhost:3000" });

// Big macOS-style cursor drawn in the page (so it is captured), with a click pulse. Dev badge hidden.
await ctx.addInitScript(() => {
  const install = () => {
    const st = document.createElement("style");
    st.textContent = `nextjs-portal{display:none!important}
      #__demo_cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35));will-change:transform}
      #__demo_pulse{position:fixed;z-index:2147483646;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #0b63c4;opacity:0}`;
    document.head.appendChild(st);
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.innerHTML = '<svg width="46" height="46" viewBox="0 0 24 24"><path d="M3 2 L10.2 21 L12.8 13.6 L20.2 11 Z" fill="#1c1c1c" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const pulse = document.createElement("div");
    pulse.id = "__demo_pulse";
    document.body.append(c, pulse);
    const saved = JSON.parse(sessionStorage.getItem("__demo_pos") || '{"x":960,"y":1200}');
    const place = (x, y) => { c.style.transform = `translate(${x - 5.7}px, ${y - 3.8}px)`; sessionStorage.setItem("__demo_pos", JSON.stringify({ x, y })); };
    place(saved.x, saved.y);
    document.addEventListener("mousemove", (e) => place(e.clientX, e.clientY), true);
    document.addEventListener("mousedown", (e) => {
      pulse.style.left = e.clientX + "px"; pulse.style.top = e.clientY + "px";
      pulse.animate([{ opacity: 0.9, transform: "scale(.4)" }, { opacity: 0, transform: "scale(1.5)" }], { duration: 450, easing: "ease-out" });
      c.animate([{ scale: 1 }, { scale: 0.85 }, { scale: 1 }], { duration: 180 });
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
});

const page = await ctx.newPage();
page.setDefaultTimeout(20000);

// Screencast: every frame to disk with its timestamp.
const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const file = `frames/f${String(n++).padStart(6, "0")}.jpg`;
  writeFileSync(path.join(OUT, file), Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

// ---- cursor helpers
let pos = { x: 960, y: 1200 };
const sleep = (ms) => page.waitForTimeout(ms);
async function moveTo(x, y, ms = 650) {
  const steps = Math.max(10, Math.round(ms / 16));
  const { x: sx, y: sy } = pos;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 3);
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(16);
  }
  pos = { x, y };
}
async function box(loc) { await loc.scrollIntoViewIfNeeded(); await sleep(150); return loc.boundingBox(); }
async function clickOn(loc, { ms = 650, before = 220, after = 350 } = {}) {
  const b = await box(loc);
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, ms);
  await sleep(before);
  await page.mouse.down(); await sleep(80); await page.mouse.up();
  await sleep(after);
}
async function typeInto(loc, text, delay = 26) { await clickOn(loc, { after: 120 }); await page.keyboard.type(text, { delay }); await sleep(300); }
async function scrollBy(dy, ms = 1200) {
  const steps = Math.max(8, Math.round(ms / 30));
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(30); }
}
async function upload(dropzone, file) {
  const chooser = page.waitForEvent("filechooser");
  await clickOn(dropzone, { after: 100 });
  await (await chooser).setFiles(file);
  await sleep(700);
}

try {
  // ===== A. Landing → audit
  await page.goto("/");
  await page.getByRole("button", { name: /Audit my profile, free/ }).waitFor();
  await sleep(600);
  mark("landing");
  await moveTo(760, 560, 900);
  await sleep(1400);
  mark("click-start");
  await clickOn(page.getByRole("button", { name: /Audit my profile, free/ }));
  await page.waitForURL("**/audit/new", { timeout: 60000 });
  await sleep(900);
  mark("wizard");
  await clickOn(page.getByRole("radio", { name: /Personal profile/ }));
  await clickOn(page.getByRole("button", { name: "Continue" }));
  mark("step2");
  await clickOn(page.getByRole("radio", { name: /Inbound client leads/ }));
  await clickOn(page.getByRole("button", { name: "Seed–Series A SaaS founders" }));
  await typeInto(page.getByLabel(/What do you sell/), "Brand identity projects; book a discovery call");
  await clickOn(page.getByRole("button", { name: "Continue" }));
  mark("step3");
  await clickOn(page.getByRole("button", { name: "Help: Download your profile as a PDF" }));
  mark("pdf-help");
  await sleep(2200);
  await page.keyboard.press("Escape");
  await sleep(400);
  await upload(page.locator("label:has(input[type=file])"), path.join(DEMO, "Profile.pdf"));
  mark("pdf-uploaded");
  await typeInto(page.getByLabel(/Photo, banner, Featured and posts/), "Beach photo with sunglasses, default blue banner, nothing in Featured, Open to work is on", 18);
  mark("run-audit");
  await clickOn(page.getByRole("button", { name: "Run my audit" }));
  await page.waitForURL(/\/audit\/[0-9a-f-]{36}$/, { timeout: 300000 });
  await page.getByText("out of 100").waitFor();
  await moveTo(1500, 700, 500);
  await sleep(1500);
  mark("report");
  await scrollBy(700, 1600); await sleep(1300); mark("report-sections");
  await scrollBy(900, 1800); await sleep(1300); mark("report-fixes");
  await page.getByRole("heading", { name: "Ready-to-paste rewrites" }).scrollIntoViewIfNeeded();
  await sleep(800);
  mark("report-rewrites");
  await clickOn(page.getByRole("button", { name: "Copy" }).first());
  mark("copied");
  await sleep(1400);
  await scrollBy(900, 1600); await sleep(800);
  mark("report-end");

  // ===== B. Post from a meeting
  await page.goto("/posts/new?mode=meeting");
  await page.getByText("Drag your transcript here, or click to choose").waitFor();
  await sleep(900);
  mark("composer");
  await upload(page.locator("label:has(input[type=file])"), path.join(DEMO, "retro-meeting.vtt"));
  mark("transcript-uploaded");
  await clickOn(page.getByRole("button", { name: "I ran this meeting" }));
  await typeInto(page.getByLabel("Who should stop scrolling for this?"), "B2B SaaS founders and customer success leaders", 20);
  mark("summarise");
  await clickOn(page.getByRole("button", { name: /Summarise meeting/ }));
  const questions = page.getByRole("heading", { name: /quick questions/ });
  const result = page.getByText("Pick your hook");
  await Promise.race([questions.waitFor({ timeout: 300000 }), result.waitFor({ timeout: 300000 })]);
  await sleep(1000);
  if (await questions.isVisible()) {
    mark("questions");
    await typeInto(page.locator("textarea[id^=answer-]").first(), "The kickoff deck. Sales promised it in every deal, and nobody checked if customers used it.", 20);
    mark("write");
    await clickOn(page.getByRole("button", { name: "Write the posts ✨" }));
    await result.waitFor({ timeout: 300000 });
  }
  await sleep(1200);
  mark("result");
  await scrollBy(500, 1200); await sleep(1200);
  mark("angles");
  const show = page.getByRole("button", { name: "Show this post" }).first();
  if (await show.count()) { await clickOn(show); mark("switched"); await sleep(1200); }
  await page.getByText("Pick your hook").scrollIntoViewIfNeeded();
  await sleep(700);
  const hookButtons = page.locator("section", { hasText: "Pick your hook" }).getByRole("button");
  if ((await hookButtons.count()) > 1) { await clickOn(hookButtons.nth(1)); mark("hook-swapped"); }
  await sleep(900);
  await page.locator("section", { hasText: "Your post" }).first().scrollIntoViewIfNeeded();
  await sleep(1800);
  mark("post");
  await scrollBy(500, 1200); await sleep(800);
  await clickOn(page.getByText("Human-sounding check"));
  mark("human-check");
  await sleep(1800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1200);
  await clickOn(page.getByText("Show key points, decisions, action items and quotes"));
  mark("summary-open");
  await sleep(2000);
  mark("end");
} catch (err) {
  console.error("RECORDING FAILED:", err.message);
  await page.screenshot({ path: path.join(OUT, "failure.png") });
  process.exitCode = 1;
} finally {
  await cdp.send("Page.stopScreencast").catch(() => {});
  await sleep(300);
  writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
  writeFileSync(path.join(OUT, "marks.json"), JSON.stringify(marks, null, 2));
  await browser.close();
  console.log(`frames: ${frames.length}`);
}
