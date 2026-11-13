# Profile Pilot

A web app that helps people make LinkedIn attract the customers they want.

- **Profile audit:** the user picks personal profile or company page and answers a few clickable questions (goal, ideal customer, offer, proof). They then upload their LinkedIn PDF, or paste text, with ⓘ popups explaining how. The result is a score out of 100, a score for each section, the top 5 fixes, what's missing, rewrites they can paste in (with character counters), keywords, and next steps.
- **Post generator:** the user describes a scenario and picks what the post should earn (comments, reposts, likes, saves or leads), a hook formula (or Auto), length, tone, and optionally pastes past posts so the result matches their voice. Two Claude passes run: a **writer** that uses 20 proven hook formulas and 2026 feed rules, then a **humanizer** that removes AI-sounding phrasing and reports what it changed. The result is 3 hooks, the post in a LinkedIn-style preview, a first comment, and visual and timing tips.
- **Post from a meeting:** upload a transcript (Zoom/Teams `.vtt`, `.srt`, `.txt`, `.md`, Google Meet `.docx`, `.pdf`) or paste it, and say **who's posting** (required: the post is written in that person's first-person voice). Step 1 summarises the meeting (overview, key points, decisions, action items, quotes, open questions) and picks 2-3 **distinctive** angles, each with an optional question for the author. Step 2 writes a post for **every** angle in parallel; switching between them is instant. Names, clients and confidential numbers stay out of the post by default, with a "Check before posting" list.
- **My CTA:** users save one standing offer (and link) once; every post can end with it after the value, with the link in the first comment by default. Stored in `user_settings` (migration `0002`).
- **Story-first promo guard:** launch / event / offer / sponsorship scenarios are written story-first, with the offer only in the last 2 lines; the result screen says when this happened.
- **Number Paradox (F21):** a hook formula from our own audit of top LinkedIn posts (`LINKEDIN_POST_AUDIT.md`).
- **Quick questions before writing:** for normal posts, the AI first checks whether the post needs something only the author knows (an opinion, a reason, an example) and asks up to 2 optional questions instead of leaving blanks to fill in later.
- **Reader payoff:** every post states what the target reader gets from its first two lines, and never opens with "our meeting / our sync".
- **History:** every audit and post is saved to the user's account.

Built with Next.js 16 (App Router), Supabase (auth + Postgres) and the Claude API (`claude-opus-5-5`, structured outputs).

## Project map

| Path | What it is |
|---|---|
| `app/page.tsx` | Landing page + sign in (LinkedIn or email link) |
| `app/dashboard/` | Start an audit or post; history |
| `app/audit/new/AuditWizard.tsx` | The 3-step interactive questionnaire with ⓘ help |
| `app/audit/[id]/` + `components/AuditReportView.tsx` | The audit report |
| `app/posts/new/PostComposer.tsx` + `components/PostResultView.tsx` | Post generator |
| `app/api/audit/route.ts`, `app/api/posts/route.ts` | Server endpoints (auth check, Claude, save) |
| `lib/claude.ts` | **The AI brain**: prompts and Claude calls |
| `lib/knowledge/core.ts` | Audit checklists (from our `linkedin-profile-optimizer` skill) |
| `lib/knowledge/linkedin-skills.ts` | Hook formulas, humanizer, algorithm rules and profile scorecard, adapted from [sergebulaev/linkedin-skills](https://github.com/sergebulaev/linkedin-skills) (MIT; see `THIRD_PARTY_NOTICES.md`) |
| `lib/knowledge/marketing-skills.ts` | LinkedIn post templates, platform notes, copywriting principles, the AI-tells blacklist, carousel frameworks and content atoms, adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT). Conflicts with linkedin-skills are settled by `STYLE_PRECEDENCE` in `lib/claude.ts` |
| `lib/formulas.ts` | The 20 hook formulas as picker options |
| `lib/transcript.ts`, `lib/transcript-file.ts`, `app/api/meeting/route.ts` | Meeting transcripts: reading `.vtt`/`.srt`/`.docx`/`.pdf`, then the summary → post pipeline |
| `lib/schemas.ts` | Input validation + the exact shape of audit/post results |
| `components/guides.tsx` | Content of every ⓘ popup |
| `supabase/migrations/0001_init.sql` | Database tables + row-level security |
| `proxy.ts` | Keeps users signed in; protects app pages |

## Setup

1. **Install:** `npm install`
2. **Supabase:** create a project at supabase.com, then run `supabase/migrations/0001_init.sql` in the SQL editor.
3. **Env:** copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key, plus your `ANTHROPIC_API_KEY` from console.anthropic.com.
4. **Auth URLs:** in Supabase → Authentication → URL Configuration, set the Site URL. Then add `http://localhost:3000/auth/callback` (and your production URL + `/auth/callback`) to the Redirect URLs.
5. **Sign in with LinkedIn (optional; email sign-in works without it):**
   1. Create an app at linkedin.com/developers. It needs a LinkedIn company page.
   2. On the app's **Products** tab, add **Sign In with LinkedIn using OpenID Connect**.
   3. Under **Auth**, add the redirect URL `https://<your-project>.supabase.co/auth/v1/callback`.
   4. In Supabase → Authentication → Providers → **LinkedIn (OIDC)**, paste the Client ID and Secret.
6. **Run:** `npm run dev`, then open http://localhost:3000

## AI provider: API key or local Claude (development only)

| `AI_PROVIDER` | What it uses | When |
|---|---|---|
| `api` (default) | `ANTHROPIC_API_KEY`, billed to your Anthropic Console credits | Production, staging, anything other people use |
| `claude-code` | Your local Claude Code CLI (`claude -p`), signed in with **your own** Claude subscription | Local development and testing on your machine only |

`lib/claude-code.ts` runs each call in an empty temp folder with no tools (only `Read` for an attached PDF), the app's own system prompt, the same model and effort, and the API key removed from the CLI's environment so it uses your sign-in. The app refuses to start with `claude-code` when `NODE_ENV=production`, because a personal subscription can't be used to serve other people. If the CLI isn't signed in, run `claude` and use `/login`.

## Deploy

Push to GitHub and import the repo in Vercel. Add the same env vars there, and add the production callback URL in Supabase. Audits can take about a minute. The audit route sets `maxDuration = 300`, so check that your Vercel plan allows it.

## Costs & limits

Each audit is one Claude call (`effort: "high"`). Each post is a quick questions check (`effort: "low"`) plus two calls, writer and humanizer (`effort: "medium"`). A meeting post is one summary call plus writer + humanizer for each of the 2-3 angles, run in parallel. The large rulebooks are sent as prompt-cached system blocks, so repeat calls cost less. Requests use server-side refusal fallbacks (`fallbacks: "default"`).

## Notes

- LinkedIn's API doesn't let apps read a member's full profile, so "Sign in with LinkedIn" only provides name, email and photo. That's why the profile itself comes from the PDF export.
- "Profile Pilot" is a working name. Avoid using "LinkedIn" in your product name or logo; it's a LinkedIn trademark.
