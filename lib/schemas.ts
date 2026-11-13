import { z } from "zod";
import { FORMULA_CODES } from "./formulas";

// ---------- Inputs ----------

export const ProfileType = z.enum(["personal", "company"]);
export type ProfileType = z.infer<typeof ProfileType>;

export const AuditInput = z.object({
  profileType: ProfileType,
  goal: z.string().trim().min(2).max(300),
  idealCustomer: z.string().trim().min(2).max(500),
  offer: z.string().trim().max(800).optional().default(""),
  proof: z.string().trim().max(2000).optional().default(""),
  visuals: z.string().trim().max(1000).optional().default(""),
  profileText: z.string().trim().max(40000).optional().default(""),
});
export type AuditInput = z.infer<typeof AuditInput>;

// An answer to one of the quick questions asked before writing (empty answers are dropped).
export const Answer = z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().max(1000) });
export type Answer = z.infer<typeof Answer>;

export const PostInput = z.object({
  scenario: z.string().trim().min(20).max(4000),
  audience: z.string().trim().max(300).optional().default(""),
  goal: z.enum(["comments", "reposts", "likes", "saves", "leads"]).default("comments"),
  formula: z.union([z.literal("auto"), z.enum(FORMULA_CODES)]).default("auto"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  tone: z.enum(["bold", "story", "professional"]).default("story"),
  voiceSamples: z.string().trim().max(6000).optional().default(""),
  includeCta: z.boolean().optional().default(false),
  answers: z.array(Answer).max(3).optional().default([]),
  auditId: z.string().uuid().optional(),
});

// "My CTA": the user's standing offer, added to the end of posts.
export const CtaSettings = z.object({
  offer: z.string().trim().max(200).default(""),
  url: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine((u) => u === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(u), "Enter a full link starting with https://"),
  linkInBody: z.boolean().default(false),
});
export type CtaSettings = z.infer<typeof CtaSettings>;
export type PostInput = z.infer<typeof PostInput>;

// Post from a meeting transcript: the same post options, plus the transcript and optional context.
export const MeetingInput = PostInput.omit({ scenario: true, auditId: true, answers: true }).extend({
  role: z.string({ message: "Tell us who's posting." }).trim().min(2, "Tell us who's posting.").max(300),
  angleHint: z.string().trim().max(500).optional().default(""),
  transcriptText: z.string().trim().max(200_000).optional().default(""),
});
export type MeetingInput = z.infer<typeof MeetingInput>;

// Step 1 of the questions flow for a normal post.
export const QuestionsInput = PostInput.pick({ scenario: true, audience: true, goal: true });

// ---------- Claude structured outputs ----------
// Keep these schemas simple (no min/max): structured outputs constrain shape,
// the prompt constrains ranges, and the UI double-checks character limits.

export const AuditReport = z.object({
  subject_name: z.string().describe("Person or company name as shown on the profile"),
  ideal_customer_summary: z.string().describe("One line restating who the profile should attract"),
  overall_score: z.number().describe("0-100"),
  headline_diagnosis: z
    .string()
    .describe("2-3 sentences: the single biggest reason this buyer isn't reaching out, and the biggest opportunity"),
  sections: z.array(
    z.object({
      section: z.string(),
      score: z.number().nullable().describe("0-10, or null if it could not be seen and must be verified"),
      verdict: z.string().describe("One short sentence, quoting current text where useful"),
    }),
  ),
  top_fixes: z.array(
    z.object({
      title: z.string(),
      why: z.string().describe("Why it matters for this ideal customer"),
      how: z.string().describe("Exactly what to change"),
    }),
  ),
  missing: z.array(z.object({ element: z.string(), why: z.string() })),
  rewrites: z.object({
    headlines: z.array(z.string()).describe("3 options. Personal headline <=220 chars; company tagline <=120 chars"),
    about: z.string().describe("Full About/overview. Personal <=2600 chars, company <=2000 chars. Ends on the call to action."),
    other: z.array(
      z.object({
        field: z.string().describe("e.g. Banner text, Custom button, Featured, Experience: <role>, Specialties"),
        text: z.string(),
        note: z.string().describe("Where to paste it / anything to fill in; empty string if none"),
      }),
    ),
  }),
  keywords: z.array(z.object({ term: z.string(), where: z.string() })),
  needs_verification: z.array(z.string()).describe("Things you could not see and the user should check"),
  next_steps: z.array(z.string()),
});
export type AuditReport = z.infer<typeof AuditReport>;

// Stage 1: the writer drafts with a hook formula.
export const PostDraft = z.object({
  formula: z.object({
    code: z.string().describe("F1-F20"),
    name: z.string(),
    why: z.string().describe("One sentence: why this formula fits this scenario and goal"),
  }),
  hooks: z.array(
    z.object({
      formula_code: z.string().describe("F1-F20; may differ per hook"),
      text: z.string().describe("First line. Under ~140 characters. Never a question."),
    }),
  ),
  post: z.string().describe("Full ready-to-paste post; its first line is hooks[0].text"),
  first_comment: z.string().describe("Text for the first comment (link/resource), or empty string if not needed"),
  visual: z.string().describe("One-line visual/format suggestion"),
  best_time: z.string().describe("One-line best-time-to-post note for this audience"),
  placeholders: z.array(z.string()).describe("Any [placeholders] the user must fill in; empty if none"),
  promo_story_first: z.boolean().describe("True if the scenario was mainly promotional and you applied the story-first rule"),
  reader_payoff: z.string().describe("One sentence: what the target reader gets from the first two lines (a stake, a surprising fact, something to use or argue with)"),
});
export type PostDraft = z.infer<typeof PostDraft>;

// Stage 2: the humanizer pass rewrites only what needs it and reports what changed.
export const HumanizedPost = z.object({
  post: z.string(),
  hooks: z.array(z.string()).describe("The 3 hooks after the same pass, same order"),
  first_comment: z.string(),
  changes: z.array(z.object({ tell: z.string(), fix: z.string() })).describe("Each AI tell found and how it was fixed; empty if clean"),
  reader_read: z.enum(["reads human", "mixed", "reads AI"]).describe("Reader-tell estimate for the final post (not a detector score)"),
});
export type HumanizedPost = z.infer<typeof HumanizedPost>;

// Meeting summary + candidate post angles, produced before the post is written.
export const MeetingSummary = z.object({
  title: z.string().describe("Short descriptive title of the meeting"),
  overview: z.string().describe("2-3 sentence summary"),
  key_points: z.array(z.string()),
  decisions: z.array(z.string()).describe("Empty if none were made"),
  action_items: z.array(z.object({ owner: z.string().describe("As named in the transcript, or 'Unassigned'"), task: z.string(), due: z.string().describe("Empty string if not stated") })),
  notable_quotes: z.array(z.object({ speaker: z.string(), quote: z.string().describe("Verbatim from the transcript") })).describe("Up to 3"),
  open_questions: z.array(z.string()),
  post_angles: z.array(
    z.object({
      headline: z.string().describe("The angle in under 12 words"),
      why: z.string().describe("Why the target reader would care, one sentence"),
      scenario: z.string().describe("First-person scenario for the post writer: 60-250 words, only facts from the transcript, other people and companies anonymised"),
      withheld: z.array(z.string()).describe("Sensitive details deliberately left out of this angle"),
      question: z.string().describe("One short question for the author whose answer would make this post clearly stronger (their opinion, the reason behind a decision, or a missing detail). Empty string if the angle is complete."),
    }),
  ).describe("2-3 distinct angles, most distinctive first"),
  privacy_notes: z.array(z.string()).describe("What the user should double-check before posting; empty if nothing sensitive"),
});
export type MeetingSummary = z.infer<typeof MeetingSummary>;

// Step 2 of a meeting post: write a post for every angle of an already-summarised meeting.
export const MeetingPostsInput = MeetingInput.omit({ transcriptText: true, angleHint: true }).extend({
  meeting: MeetingSummary,
  answers: z.array(z.string().trim().max(1000)).max(3).optional().default([]), // by angle index
});
export type MeetingPostsInput = z.infer<typeof MeetingPostsInput>;

export const PostQuestions = z.object({
  questions: z.array(z.object({
    question: z.string().describe("Short, specific, answerable in one or two sentences"),
    why: z.string().describe("Five to ten words on how the answer improves the post"),
  })).describe("0-2 questions; empty if the scenario already has what the post needs"),
});
export type PostQuestions = z.infer<typeof PostQuestions>;

// What the app stores and shows.
export type GeneratedPost = {
  reader_payoff?: string;
  /** Meeting posts: one post per angle (same order as meeting.post_angles); null where an angle failed. */
  angle_posts?: (GeneratedPost | null)[];
  promo_story_first?: boolean;
  cta_used?: boolean;
  meeting?: MeetingSummary;
  angle_index?: number;
  formula?: PostDraft["formula"];
  hooks: { pattern: string; text: string }[];
  post: string;
  first_comment: string;
  visual: string;
  best_time: string;
  placeholders: string[];
  changes?: HumanizedPost["changes"];
  reader_read?: HumanizedPost["reader_read"];
};

export const LIMITS = {
  personal: { headline: 220, about: 2600 },
  company: { headline: 120, about: 2000 },
  post: 3000,
} as const;
