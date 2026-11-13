import type { AuditReport, GeneratedPost } from "../../lib/schemas";

/** A deterministic audit report, seeded into Supabase and returned by mocked APIs. */
export const AUDIT_FIXTURE: AuditReport = {
  subject_name: "E2E Test Profile",
  ideal_customer_summary: "Seed-stage SaaS founders who need a brand before their raise",
  overall_score: 42,
  headline_diagnosis: "E2E diagnosis: the headline lists tools instead of outcomes for founders.",
  sections: [
    { section: "Headline", score: 3, verdict: "Lists software tools, not the founder's outcome." },
    { section: "About", score: 7, verdict: "Has a story but no call to action." },
    { section: "Banner", score: null, verdict: "Not visible in the PDF export." },
  ],
  top_fixes: [
    { title: "Rewrite the headline", why: "Founders scan it first.", how: "Use option A below." },
    { title: "Add a booking link", why: "No next step today.", how: "Add it to Featured." },
    { title: "Fill Featured", why: "Proof is buried.", how: "Pin the case study." },
    { title: "Turn off Open to work", why: "Signals job hunting.", how: "Settings → Open to." },
    { title: "Ask clients for recommendations", why: "Only a 2019 manager rec.", how: "Use the template." },
  ],
  missing: [{ element: "Featured section", why: "Founders look for proof." }],
  rewrites: {
    headlines: [
      "Brand identity for seed & Series A SaaS founders | [X launches] | Book a discovery call",
      // Deliberately over the 220-character limit so the UI's red counter can be tested.
      "OVERLIMIT " + "x".repeat(230),
    ],
    about: "First line hook for founders.\n\nMiddle with [placeholder proof].\n\nBook a 20-minute discovery call: [booking link]",
    other: [{ field: "Banner text", text: "Brand identities for SaaS founders · Book a call", note: "Keep text in the right two-thirds." }],
  },
  keywords: [{ term: "brand identity", where: "Headline, About" }],
  needs_verification: ["Whether a custom button is available"],
  next_steps: ["Change the headline today", "Add a booking link"],
};

/** A deterministic generated post (writer + humanizer output). */
export const POST_FIXTURE: GeneratedPost = {
  formula: { code: "F7", name: "Odd-Precision Money Ledger", why: "E2E: the scenario has an exact number." },
  hooks: [
    { pattern: "F7 · Odd-Precision Money Ledger", text: "E2E hook one: 12 days to rebrand before a raise." },
    { pattern: "F17 · Controlled A/B Anecdote", text: "E2E hook two: same founder, two logos, one raise." },
    { pattern: "F9 · Curiosity Gap", text: "E2E hook three: two investors noticed the brand." },
  ],
  post: "E2E hook one: 12 days to rebrand before a raise.\n\nBody line with [deliverable].\n\nWhat changed your raise? \n\n#startups",
  first_comment: "E2E first comment: case study link.",
  visual: "E2E visual: before/after carousel.",
  best_time: "E2E time: Tue 8:00 AM ET.",
  placeholders: ["[deliverable]"],
  changes: [{ tell: "E2E staccato run", fix: "Merged into one sentence" }],
  reader_read: "reads human",
};

/** A deterministic meeting summary + post, returned by the mocked /api/meeting. */
export const MEETING_POST_FIXTURE: GeneratedPost = {
  ...POST_FIXTURE,
  post: "E2E meeting hook: onboarding went from 41 days to 6.\n\nWe deleted three steps nobody used.\n\nWhat step did your team keep too long?",
  hooks: [
    { pattern: "F7 · Odd-Precision Money Ledger", text: "E2E meeting hook: onboarding went from 41 days to 6." },
    { pattern: "F17 · Controlled A/B Anecdote", text: "E2E meeting hook two: same team, three fewer steps." },
    { pattern: "F9 · Curiosity Gap", text: "E2E meeting hook three: customers never missed the deck." },
  ],
  angle_index: 0,
  meeting: {
    title: "E2E Retro: onboarding project",
    overview: "E2E overview: onboarding dropped from 41 days to 6 by removing unused steps.",
    key_points: ["E2E key point: three steps were deleted"],
    decisions: ["E2E decision: roll out to every new customer"],
    action_items: [{ owner: "Omar", task: "E2E task: write the playbook", due: "the 15th" }],
    notable_quotes: [{ speaker: "Sara", quote: "E2E quote: remove before you automate" }],
    open_questions: ["E2E open question: will enterprise accept it?"],
    post_angles: [
      { headline: "E2E angle one: 41 days to 6", why: "Founders want faster onboarding.", scenario: "E2E scenario one", withheld: ["Customer name"], question: "E2E question one: which step was hardest to cut?" },
      { headline: "E2E angle two: legal waiting time", why: "Ops leaders feel this pain.", scenario: "E2E scenario two about eleven days waiting on legal", withheld: [], question: "" },
    ],
    privacy_notes: ["E2E privacy: don't share the renewal amount"],
  },
  reader_payoff: "E2E payoff: a copyable way to cut onboarding time.",
};

/** The summary returned by step 1 (/api/meeting). */
export const MEETING_SUMMARY = MEETING_POST_FIXTURE.meeting!;

/** The second angle's post, so switching angles can be checked. */
export const ANGLE_TWO_POST: GeneratedPost = {
  ...POST_FIXTURE,
  post: "E2E angle two post: eleven days waiting on legal for a document that never changed.\n\nWhat would you cut?",
  hooks: [{ pattern: "F10 · Contrarian + Receipts", text: "E2E angle two post: eleven days waiting on legal for a document that never changed." }],
};
MEETING_POST_FIXTURE.angle_posts = [{ ...MEETING_POST_FIXTURE, meeting: undefined, angle_posts: undefined }, ANGLE_TWO_POST];
