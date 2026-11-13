// Dev-only smoke test: runs the app's real Claude pipeline without the web UI or database.
// Usage: npx tsx --conditions=react-server --env-file=.env.local scripts/smoke.mts post|audit [profile.txt]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { askPostQuestions, runAudit, runMeetingPosts, runPost, summarizeMeeting } from "../lib/claude";
import { cleanTranscript } from "../lib/transcript";
import { extractDocxText } from "../lib/transcript-file";
import { AuditInput, MeetingInput, MeetingPostsInput, PostInput } from "../lib/schemas";

const [mode, file] = process.argv.slice(2);
mkdirSync("scripts/out", { recursive: true });
const t0 = Date.now();

if (mode === "post") {
  const input = PostInput.parse({
    scenario: process.env.SMOKE_SCENARIO ?? "Last month a seed-stage founder came to me 3 weeks before their fundraise with a logo made in Canva. We did a full brand identity in 12 days. Two investors complimented the brand in their meetings.",
    audience: process.env.SMOKE_AUDIENCE ?? "Seed-stage SaaS founders",
    goal: (process.env.SMOKE_GOAL as "leads") ?? "leads",
    formula: process.env.SMOKE_FORMULA ?? "auto",
    includeCta: !!process.env.SMOKE_CTA_OFFER,
  });
  const cta = process.env.SMOKE_CTA_OFFER ? { offer: process.env.SMOKE_CTA_OFFER, url: process.env.SMOKE_CTA_URL ?? "", linkInBody: process.env.SMOKE_CTA_IN_BODY === "1" } : null;
  const result = await runPost(input, { cta });
  writeFileSync("scripts/out/post.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} else if (mode === "audit") {
  const input = AuditInput.parse({
    profileType: "personal",
    goal: process.env.SMOKE_GOAL ?? "Inbound client leads",
    idealCustomer: process.env.SMOKE_ICP ?? "Founders and marketing leads at B2B companies",
    profileText: readFileSync(file, "utf8"),
  });
  const result = await runAudit(input);
  writeFileSync("scripts/out/audit.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (mode === "meeting") {
  const text = file.endsWith(".docx") ? await extractDocxText(readFileSync(file)) : cleanTranscript(readFileSync(file, "utf8"));
  const input = MeetingInput.parse({ audience: process.env.SMOKE_AUDIENCE ?? "", goal: "comments", role: process.env.SMOKE_ROLE ?? "I'm the CEO" });
  const meeting = await summarizeMeeting(input, { text });
  console.error("[meeting] summary done in", ((Date.now() - t0) / 1000).toFixed(1), "s; questions:", meeting.post_angles.map((a) => a.question));
  const answers = (process.env.SMOKE_ANSWERS ?? "").split("|");
  const result = await runMeetingPosts(MeetingPostsInput.parse({ ...input, meeting, answers }));
  writeFileSync("scripts/out/meeting.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (mode === "questions") {
  const out = await askPostQuestions({ scenario: process.env.SMOKE_SCENARIO ?? "", audience: process.env.SMOKE_AUDIENCE ?? "", goal: "comments" });
  console.log(JSON.stringify(out, null, 2));
}
console.error(`\n[${mode}] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
