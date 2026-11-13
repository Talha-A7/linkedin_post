import { defineConfig, devices } from "@playwright/test";

// Supabase URL/key for global setup (seeding); Next loads this file itself for the app.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides env vars directly.
}

/**
 * Profile Pilot end-to-end tests.
 *
 *   npm run test:e2e            all functional + responsive tests (AI calls mocked, free)
 *   npm run test:e2e:live       also runs @live tests that call the real Claude API (costs money)
 *
 * Folder layout: see e2e/README.md
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  grepInvert: process.env.E2E_LIVE ? undefined : /@live/,
  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    // Functional suite on desktop Chrome.
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec/ },
    // Key flows again on a phone, to catch mobile-only breakage.
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, testMatch: /(landing|audit-wizard|post-composer|report|meeting|cta)\.spec/ },
    // Layout checks across many viewport widths (the spec loops over sizes itself).
    { name: "responsive", use: { ...devices["Desktop Chrome"] }, testMatch: /responsive\.spec/ },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
