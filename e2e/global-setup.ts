import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { AUDIT_FIXTURE, MEETING_POST_FIXTURE, POST_FIXTURE } from "./fixtures/data";
import { GUEST_STATE, SEED_FILE } from "./fixtures/paths";
import { readSessionFromCookies } from "./utils/session";

/**
 * Runs once per test run:
 * 1. Starts a guest session through the real UI (landing → "Audit my profile, free").
 * 2. Seeds one audit and one post for that guest straight into Supabase (no AI cost).
 * 3. Saves the browser state so tests start already signed in as that guest.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  mkdirSync("e2e/.auth", { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto("/");
  await page.getByRole("button", { name: /audit my profile, free/i }).click();
  await page.waitForURL("**/audit/new", { timeout: 30_000 });
  await page.context().storageState({ path: GUEST_STATE });
  const cookies = await page.context().cookies();
  await browser.close();

  const session = readSessionFromCookies(cookies);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false },
  });

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      profile_type: "personal",
      goal: "Inbound client leads",
      ideal_customer: "Seed-stage SaaS founders",
      offer: "Brand identity projects",
      overall_score: AUDIT_FIXTURE.overall_score,
      subject_name: AUDIT_FIXTURE.subject_name,
      report: AUDIT_FIXTURE,
    })
    .select("id")
    .single();
  if (auditError) throw new Error(`Seeding audit failed: ${auditError.message}`);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({ audit_id: audit.id, scenario: "E2E seeded scenario about a client rebrand.", goal: "leads", tone: "story", result: POST_FIXTURE })
    .select("id")
    .single();
  if (postError) throw new Error(`Seeding post failed: ${postError.message}`);

  const { data: meetingPost, error: meetingError } = await supabase
    .from("posts")
    .insert({ scenario: "Meeting: E2E Retro: onboarding project", goal: "comments", tone: "story", result: MEETING_POST_FIXTURE })
    .select("id")
    .single();
  if (meetingError) throw new Error(`Seeding meeting post failed: ${meetingError.message}`);

  writeFileSync(SEED_FILE, JSON.stringify({ auditId: audit.id, postId: post.id, meetingPostId: meetingPost.id, userId: session.user.id }, null, 2));
}
