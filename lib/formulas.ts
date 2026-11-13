// Hook formulas F1-F20 from github.com/sergebulaev/linkedin-skills (MIT), plus F21 (our own), as picker options.
// Full skeletons and caveats live in lib/knowledge/linkedin-skills.ts (HOOK_FORMULAS).

export type PostGoal = "comments" | "reposts" | "likes" | "saves" | "leads";

export const FORMULAS = [
  { code: "F1", name: "Platform Risk Anaphora", bestFor: "Category or platform arguments", goals: ["comments"] },
  { code: "F2", name: "R.I.P. Obituary", bestFor: "An era or practice that's ending", goals: ["reposts"] },
  { code: "F3", name: "Year-over-Year Pivot", bestFor: "How you've changed, founder reflection", goals: ["comments"] },
  { code: "F4", name: "Time-Anchor Confession", bestFor: "A real, dated mistake or cost", goals: ["comments"] },
  { code: "F5", name: "Self-Proving Meta", bestFor: "A public test or commitment", goals: ["comments"] },
  { code: "F6", name: "Lead Magnet", bestFor: "Giving away a real resource", goals: ["leads"] },
  { code: "F7", name: "Odd-Precision Money Ledger", bestFor: "Exact costs or numbers, build logs", goals: ["saves"] },
  { code: "F8", name: "Paid-vs-Free Reversal", bestFor: "Giving away a framework", goals: ["reposts", "saves", "leads"] },
  { code: "F9", name: "Curiosity Gap", bestFor: "A surprising behind-the-scenes result", goals: ["comments"] },
  { code: "F10", name: "Contrarian + Receipts", bestFor: "Challenging a common belief with evidence", goals: ["comments"] },
  { code: "F11", name: "Emotional Cold-Open", bestFor: "A real story with emotional stakes", goals: ["likes"] },
  { code: "F12", name: "Permission Slip", bestFor: "Encouraging a discouraged audience", goals: ["comments"] },
  { code: "F13", name: "Bait-and-Switch Reversal", bestFor: "A change that turns out to be good news", goals: ["likes"] },
  { code: "F14", name: "Named Gratitude", bestFor: "Thanking a mentor, client or team", goals: ["reposts"] },
  { code: "F15", name: "Explain-to-Kids", bestFor: "Demystifying jargon", goals: ["saves"] },
  { code: "F16", name: "Status-Strip Humility", bestFor: "A senior voice showing warmth", goals: ["likes"] },
  { code: "F17", name: "Controlled A/B Anecdote", bestFor: "One change that flipped the outcome", goals: ["comments", "leads"] },
  { code: "F18", name: "False-Binary Dissolve", bestFor: "When both obvious answers fail", goals: ["comments", "reposts"] },
  { code: "F19", name: "Anecdote + Evidence", bestFor: "Something you noticed, backed by data", goals: ["saves", "leads"] },
  { code: "F20", name: "Diverging Curves", bestFor: "Two approaches that split over time", goals: ["reposts"] },
  // Added from our own audit of top LinkedIn posts (LINKEDIN_POST_AUDIT.md): the most common opener in posts that beat their creator's median.
  { code: "F21", name: "Number Paradox", bestFor: "A big real number reached in an unexpected way", goals: ["comments", "reposts", "leads"] },
] as const satisfies readonly { code: string; name: string; bestFor: string; goals: readonly PostGoal[] }[];

export type FormulaCode = (typeof FORMULAS)[number]["code"];
export const FORMULA_CODES = FORMULAS.map((f) => f.code) as [FormulaCode, ...FormulaCode[]];
