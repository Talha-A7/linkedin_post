# Profile Pilot: QA report

**Date:** 2026-11-12 · **Build:** local dev (Next.js 16.4.6) · **Tester:** Claude (automated + manual)

## Summary

| | |
|---|---|
| Automated tests | **251 passed, 0 failed** (2 skipped by design, 2 `@live` tests opt-in) |
| Test projects | Desktop Chrome · Mobile (Pixel 7) · Responsive (10 widths, 320 → 1920 px) |
| Bugs found | **9**, all fixed (1 security, 4 error-handling, 1 accessibility, 3 layout) |
| Known issues left | 2 (see below) |
| Improvements proposed | 18, **waiting for your go-ahead**, none applied |

Run it yourself: `npm run test:e2e`, then `npm run test:e2e:report` (screenshots for every screen size are attached in the report).

---

## 1. What was tested

| Area | Covered |
|---|---|
| **Landing** | Hero, both "Start" buttons (real guest sign-up), email sign-in (empty / malformed / success / rate-limited / network failure), `?error=auth`, signed-in redirect, `?next=` handling, open-redirect attacks |
| **Auth & access** | Every protected page while signed out, both APIs without a session (401), auth callback with no/invalid code, off-site `next` in callback, sign-out, unknown route (404) |
| **API validation** | Missing fields, bad profile type, over-long answers, no PDF and short text, text file renamed to `.pdf`, PDF over 5 MB, non-JSON body, scenario too short or long, invalid goal / formula / length / tone / audit id |
| **Audit wizard** | Every step's enable/disable rules, whitespace-only input, example chips, "Something else…", company vs. personal paths, Back keeps answers, all ⓘ popups (× / Esc / backdrop), PDF picker, drag & drop, wrong type, oversize, error then valid file, paste mode, full request payload |
| **Network & backend failures** (audit and post) | 400, 401, 422, 429, 500, 502, 504 HTML page, dropped connection, browser offline, slow responses (loading state, no double-submit), retry after failure keeps the user's work |
| **Report** | Every section, `verify` scores, character counters incl. over-limit, copy (granted + blocked clipboard), checkboxes, "Write a post →" pre-fill, guest "save your work" (success / email taken), unknown + malformed ids |
| **Post composer** | 20-character rule, examples, goal → suggested formulas, formula reset, single-select chips, voice samples, ⓘ popups, full payload, result (formula, 3 hooks, preview, placeholders, human check, comment, visual, timing), hook swap, copy selected version, edit scenario, try again, all failure modes |
| **Dashboard / saved post** | History lists and links, start cards, header navigation, guest badge, saved post page, 404s |
| **Responsive** | Landing, wizard steps 1-3, ⓘ popup, report, composer, post result, dashboard at 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920 px: no sideways scrolling, nothing off-screen |
| **Console** | Every functional test fails if the page throws or logs an unexpected error |

AI responses are **mocked** in the regular suite (fast, free, deterministic). `npm run test:e2e:live` runs one real audit and one real post.

---

## 2. Bugs found and fixed

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | 🔴 **High (security)** | **Open redirect.** `/?next=/\evil.com` sent signed-in users to another website (browsers read `/\` as `//`). Usable for phishing links that start on your domain. | New `lib/safe-redirect.ts` used by the landing page and the auth callback. Rejects `//`, `\`, control characters and other hosts. 20 tests guard it. |
| 2 | 🟠 Medium | Offline or dropped connection showed the raw browser text **"Failed to fetch"** (audit, post, sign-in, save-email). | `lib/net-errors.ts` → "You seem to be offline or the connection dropped. Check your internet and try again." |
| 3 | 🟠 Medium | "Audit my profile, free" while offline said **"Guest access isn't available"**, wrongly blaming the service. | Detects offline / network errors and shows the network message. |
| 4 | 🟠 Medium | **Copy** buttons threw an uncaught error when the clipboard is blocked (permissions, some in-app browsers) and gave no feedback. | Caught; button shows "Copy failed. Select the text instead". |
| 5 | 🟠 Medium | **Report page scrolled sideways** (up to ~1,500 px) when a rewrite contained a long unbroken string (URL, hashtag, long word), at every screen size. | Long strings now wrap (`overflow-wrap: anywhere` on report text, post preview and body). |
| 6 | 🟡 Low | **Header overflowed on phones** (320-360 px): "Write a post" wrapped to 3 lines, "Guest" badge cut off. | Compact header on small screens ("Post", logo icon only). |
| 7 | 🟡 Low | Guest banner's **Save button stuck out** of its card on phones. | Email field now shrinks to fit. |
| 8 | 🟡 Low (a11y) | ⓘ popups had **no accessible name**, so screen readers only announced "dialog". | `aria-labelledby` pointing at each popup's title. |
| 9 | 🟡 Low | Next.js dev warning "uncached data while prerendering" (Supabase reading the clock). *(Fixed earlier today, now covered by the console-error checks.)* | `await connection()` in the Supabase server helper. |

---

## 3. Known issues (not fixed)

1. **"Not found" pages return HTTP 200, not 404.** The user does see the 404 page. Next 16 streams these pages before the data check runs. Harmless for private pages, but monitoring tools will count them as successes. Fix proposal: improvement **I-12**.
2. **Configuration:** `.env.local` has `NEXT_PUBLIC_LINKEDIN_LOGIN=true`, but LinkedIn is **not enabled** in Supabase (`linkedin_oidc: false`). The "Continue with LinkedIn" button shows, and clicking it lands on a raw Supabase error. Either finish the LinkedIn setup (README) or set the flag back to `false`.

---

## 4. Improvements for your approval

None of these are applied. Reply with the numbers you want, e.g. "do R-1, R-2, I-3".

### Responsiveness

| # | Improvement | Why |
|---|---|---|
| **R-1** | **Composer on phones:** put Length and Tone in a 3-column row and Goals in 2 columns. | Today 13 option buttons stack in one column; the form is ~1,600 px tall at 375 px wide. |
| **R-2** | **Sticky "Generate post" / "Run my audit" button** at the bottom of the screen on phones. | The main button is far below the fold on mobile. |
| **R-3** | **Bigger tap targets:** "Copy" buttons (26 px tall), next-step checkboxes (13 px), logo (28 px) → at least 44 px. | Apple/Google guidelines; easy to mis-tap today. |
| **R-4** | **Report on phones:** collapsible sections (scores, fixes, rewrites) with a sticky mini-nav. | The report is very long on a phone. |
| **R-5** | **Landing on phones:** show the "Start" button above the 4-step explainer, and move the sign-in card below the fold. | First screen on mobile is mostly headline. |
| **R-6** | **Large screens (1440 px+):** use a 2-column report (scores + fixes left, rewrites right). | Content sits in a narrow column with wide empty margins. |

### Reliability & UX

| # | Improvement | Why |
|---|---|---|
| **I-1** | **Stream the audit and post** (show sections as they're written) instead of a ~80-90 s spinner. | Long waits feel broken, and on weak networks users may give up or reload. |
| **I-2** | **Client timeout + Cancel button** for audits and posts (e.g. 4 min). | A hung request currently spins forever. |
| **I-3** | **Global offline banner** ("You're offline") using the browser's online/offline events. | Users learn about the network only after pressing a button. |
| **I-4** | **Delete** audits and posts from History. | The database already allows it; there's no button. |
| **I-5** | **Pagination** on History (currently shows the latest 20 of each). | Older items become unreachable. |
| **I-6** | **Export the report** (PDF or "copy all"). | Users want to keep or share it. |
| **I-7** | Let guests see the landing page (today `/` always redirects signed-in users and guests to History). | Guests can't reach the sign-in card to log into a real account. |
| **I-8** | **Error page** (`error.tsx`) with a "Try again" button for unexpected server errors. | Today Next's default error screen appears. |
| **I-9** | Move keyboard focus to the error message when a submit fails, and support arrow keys in option chips. | Accessibility for keyboard and screen-reader users. |
| **I-10** | Page-specific browser tab titles ("Audit report: Talha Ahmed", "New post"). | Every tab currently has the same title. |

### Cost, security & performance

| # | Improvement | Why |
|---|---|---|
| **I-11** | **CAPTCHA on guest sign-in** (Supabase supports Cloudflare Turnstile / hCaptcha). | With guest access and no daily limit, a bot can create guests and run unlimited paid AI calls. **Strongly recommended before going public.** |
| **I-12** | Return a real **HTTP 404** for missing audits/posts. | See known issue 1. |
| **I-13** | **Spend alerts / monthly cap** in the Anthropic console, plus logging tokens per request. | Visibility into cost per user now that limits are off. |
| **I-14** | **Security headers** (Content-Security-Policy, X-Frame-Options, Referrer-Policy) in `next.config.ts`. | Standard hardening; none are set today. |
| **I-15** | **Faster/cheaper humanizer pass**: run the second post pass on Claude Sonnet 5.5 and measure quality. | The post is two Opus calls; the edit pass may not need Opus. |
| **I-16** | **Run the test suite in CI** (GitHub Actions) on every push. | Catches regressions automatically. |
| **I-17** | **Clean up test data:** the suite creates 3 guest users per run in Supabase. Add a scheduled cleanup of guests older than 30 days. | Keeps the Users table and monthly active users tidy. |
| **I-18** | **Production test run** (`next build && next start`) in CI instead of the dev server. | Confirms behaviour without dev-only code, and gives exact 404/status checks. |

---

## 5. Files added or changed during QA

**Tests (new):** `playwright.config.ts`, `e2e/` (see `e2e/README.md`), npm scripts `test:e2e`, `test:e2e:live`, `test:e2e:report`.

**App fixes:** `lib/safe-redirect.ts` (new), `lib/net-errors.ts` (new), `app/page.tsx`, `app/auth/callback/route.ts`, `app/audit/new/AuditWizard.tsx`, `app/posts/new/PostComposer.tsx`, `components/StartButton.tsx`, `components/SignIn.tsx`, `components/SaveWorkBanner.tsx`, `components/ui.tsx` (copy button), `components/InfoButton.tsx` (dialog names), `components/AppHeader.tsx` (mobile header), `components/AuditReportView.tsx`, `components/PostResultView.tsx`, `app/globals.css` (text wrapping).
