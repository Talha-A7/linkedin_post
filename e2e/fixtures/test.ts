import { test as base, expect, type Page, type Route } from "@playwright/test";
import { MEETING_POST_FIXTURE, MEETING_SUMMARY, POST_FIXTURE } from "./data";
import { GUEST_STATE, seed } from "./paths";

/** Hides the Next.js dev-mode badge (not present in production) so it can't cover buttons on small screens. */
async function hideDevOverlay(page: Page) {
  await page.addInitScript(() => {
    const add = () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(st);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  });
}

type ApiPath = "/api/audit" | "/api/posts" | "/api/meeting" | "/api/meeting/posts" | "/api/posts/questions";

/** Ways an API call can go wrong, for edge-case tests. */
export type Failure =
  | { kind: "status"; status: number; body?: unknown }
  | { kind: "html"; status: number } // e.g. a proxy/timeout page instead of JSON
  | { kind: "abort" } // connection dropped
  | { kind: "slow"; ms: number; status?: number; body?: unknown };

/** Matches exactly this API path (so "/api/meeting" doesn't also catch "/api/meeting/posts"). */
const exact = (path: string) => (url: URL) => url.pathname === path;

function mockBody(path: ApiPath) {
  if (path === "/api/audit") return { id: seed().auditId };
  if (path === "/api/meeting") return { meeting: MEETING_SUMMARY };
  if (path === "/api/meeting/posts") return { id: seed().meetingPostId, result: MEETING_POST_FIXTURE };
  if (path === "/api/posts/questions") return { questions: [] };
  return { id: seed().postId, result: POST_FIXTURE };
}

export class ApiMock {
  private matchers = new Map<string, (url: URL) => boolean>();
  constructor(private page: Page) {}

  /** One stable matcher per path, so reset() can remove exactly what was added. */
  private m(path: ApiPath) {
    if (!this.matchers.has(path)) this.matchers.set(path, exact(path));
    return this.matchers.get(path)!;
  }

  /** Removes this helper's mocks for a path. */
  async reset(path: ApiPath) {
    await this.page.unroute(this.m(path));
  }

  /** Make the endpoint succeed. Audit returns the seeded audit id; posts return the post fixture. */
  async succeed(path: ApiPath, delayMs = 0) {
    await this.page.route(this.m(path), async (route) => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const body = mockBody(path);
      await route.fulfill({ status: 200, json: body });
    });
  }

  async fail(path: ApiPath, failure: Failure) {
    await this.page.route(this.m(path), async (route: Route) => {
      switch (failure.kind) {
        case "status":
          return route.fulfill({ status: failure.status, json: failure.body ?? { error: `E2E error ${failure.status}` } });
        case "html":
          return route.fulfill({ status: failure.status, contentType: "text/html", body: "<html><body>Gateway Timeout</body></html>" });
        case "abort":
          return route.abort("internetdisconnected");
        case "slow":
          await new Promise((r) => setTimeout(r, failure.ms));
          return route.fulfill({ status: failure.status ?? 200, json: failure.body ?? { id: seed().auditId } });
      }
    });
  }

  /** Records request bodies sent to an endpoint (without changing the response). */
  async capture(path: ApiPath) {
    const calls: { postData: string | null; multipart: boolean }[] = [];
    await this.page.route(this.m(path), async (route) => {
      calls.push({ postData: route.request().postData(), multipart: (route.request().headers()["content-type"] ?? "").includes("multipart") });
      const body = mockBody(path);
      await route.fulfill({ status: 200, json: body });
    });
    return calls;
  }
}

type Fixtures = {
  api: ApiMock;
  /** Collects console errors and uncaught page errors; tests assert it stays empty. */
  pageErrors: string[];
};

/** Tests that run as the seeded guest user. */
export const test = base.extend<Fixtures>({
  storageState: GUEST_STATE,
  api: async ({ page }, use) => use(new ApiMock(page)),
  page: async ({ page }, use) => {
    await hideDevOverlay(page);
    await page.route(exact("/api/posts/questions"), (r) => r.fulfill({ json: { questions: [] } }));
    await use(page);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // Expected noise: failed requests we caused on purpose, and dev-only HMR messages.
      if (/Failed to load resource|net::ERR_|\[HMR\]|webpack-hmr|_next\/webpack/.test(t)) return;
      errors.push(`console: ${t}`);
    });
    await use(errors);
  },
});

/** Tests that run with no session at all (signed-out visitor). */
export const anonTest = base.extend<Fixtures>({
  storageState: { cookies: [], origins: [] },
  api: async ({ page }, use) => use(new ApiMock(page)),
  page: async ({ page }, use) => {
    await hideDevOverlay(page);
    await use(page);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    await use(errors);
  },
});

/** App error messages (excludes Next.js's invisible route announcer, which also has role="alert"). */
export const appAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

export { expect, seed };
