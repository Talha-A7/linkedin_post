# End-to-end tests (Playwright)

```
e2e/
├── global-setup.ts        # starts one real guest session, seeds 1 audit + 1 post, saves the login state
├── fixtures/
│   ├── test.ts            # `test` (signed-in guest) and `anonTest` (signed out) + API mock helpers + error collector
│   ├── data.ts            # deterministic audit report and post used by mocks and seeding
│   ├── paths.ts           # where the saved session and seed ids live
│   └── files/             # Profile.pdf, a text file renamed to .pdf, notes.txt
├── pages/                 # page objects: AuditWizardPage, PostComposerPage
├── utils/session.ts       # reads the Supabase session out of the auth cookie
└── tests/
    ├── landing.spec.ts        # hero, guest start, email sign-in, redirects, open-redirect protection
    ├── auth-guard.spec.ts     # protected pages and APIs when signed out, auth callback, sign-out, 404
    ├── api.spec.ts            # server-side validation of both APIs (no AI cost)
    ├── audit-wizard.spec.ts   # every step, input, file error, drag & drop, network and backend failures
    ├── report.spec.ts         # report rendering, char limits, copy, guest banner, 404s
    ├── post-composer.spec.ts  # form, payload, result, hook swap, copy, failures
    ├── meeting.spec.ts        # transcript mode: files, paste, drag & drop, summary, angle switching, failures, API validation
    ├── transcript.spec.ts     # .vtt/.srt/.docx reading (pure functions)
    ├── cta.spec.ts            # My CTA card + /api/settings, promo/CTA result notes, Number Paradox formula
    ├── dashboard.spec.ts      # history, navigation, saved post page
    ├── responsive.spec.ts     # 10 viewport widths × every page: no sideways scroll, screenshots attached
    └── live.spec.ts           # @live: real Claude calls (skipped unless E2E_LIVE=1)
```

## Run

```bash
npm run test:e2e              # everything except @live (AI responses are mocked, free)
npm run test:e2e:live         # also runs the real-AI tests (costs a few cents)
npm run test:e2e:report       # open the HTML report (screenshots from the responsive suite are attached there)
```

The suite uses the dev server on port 3000 if one is running, otherwise it starts one. It needs `.env.local` with the
Supabase URL and publishable key, and guest (anonymous) sign-ins enabled in Supabase.

## How the edge cases are simulated

| Situation | How |
|---|---|
| No network | `context.setOffline(true)` and `route.abort("internetdisconnected")` |
| Weak / slow network | `route` handlers that delay the response several seconds |
| Unauthorized | signed-out `anonTest`, plus mocked 401 responses |
| Backend errors | mocked 400 / 422 / 429 / 500 / 502 JSON and a 504 HTML page |
| Supabase auth errors | mocked `/auth/v1/otp`, `/auth/v1/signup`, `/auth/v1/user` responses |

Each run creates 3 real guest users (setup + two "start" buttons). Supabase limits anonymous sign-ins to 30 per hour per IP.
