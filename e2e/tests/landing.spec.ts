import { anonTest as test, expect, test as guestTest, appAlert } from "../fixtures/test";

test.describe("Landing page (signed out)", () => {
  test("renders hero, both calls to action and email sign-in", async ({ page, pageErrors }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("magnet for the customers");
    await expect(page.getByRole("button", { name: /Audit my profile, free/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write a post" })).toBeVisible();
    await expect(page.getByText("No sign-up needed")).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    // LinkedIn sign-in shows only when NEXT_PUBLIC_LINKEDIN_LOGIN=true.
    await expect(page.getByRole("button", { name: /Continue with LinkedIn/ })).toHaveCount(process.env.NEXT_PUBLIC_LINKEDIN_LOGIN === "true" ? 1 : 0);
    // Signed-out header shows no app navigation.
    await expect(page.getByRole("link", { name: "History" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("'Audit my profile, free' starts a guest session and opens the wizard", async ({ page, isMobile }) => {
    test.skip(isMobile, "Creates a real guest user; run once per suite to stay under Supabase rate limits.");
    await page.goto("/");
    await page.getByRole("button", { name: /Audit my profile, free/ }).click();
    await page.waitForURL("**/audit/new");
    await expect(page.getByText("Guest", { exact: true })).toBeVisible();
  });

  test("'Write a post' starts a guest session and opens the composer", async ({ page, isMobile }) => {
    test.skip(isMobile, "Creates a real guest user; run once per suite to stay under Supabase rate limits.");
    await page.goto("/");
    await page.getByRole("button", { name: "Write a post" }).click();
    await page.waitForURL("**/posts/new");
    await expect(page.getByRole("heading", { name: "Write a post people stop for" })).toBeVisible();
  });

  test("starting while offline shows a network error and stays on the page", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await page.getByRole("button", { name: /Audit my profile, free/ }).click();
    await expect(appAlert(page)).toContainText(/internet|connection|offline/i);
    await expect(page).toHaveURL(/\/$/);
    await context.setOffline(false);
  });

  test("starting when guest sign-in is rejected by the backend shows an error", async ({ page }) => {
    await page.route("**/auth/v1/signup**", (r) => r.fulfill({ status: 422, json: { code: 422, msg: "Anonymous sign-ins are disabled" } }));
    await page.goto("/");
    await page.getByRole("button", { name: /Audit my profile, free/ }).click();
    await expect(appAlert(page)).toContainText(/isn't available|sign in with your email/i);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Email sign-in form", () => {
  test("blocks empty and malformed emails without calling the backend", async ({ page }) => {
    let calls = 0;
    await page.route("**/auth/v1/otp**", (r) => { calls++; return r.fulfill({ status: 200, json: {} }); });
    await page.goto("/");
    const submit = page.getByRole("button", { name: "Email me a sign-in link" });
    await submit.click();
    await page.getByPlaceholder("you@company.com").fill("not-an-email");
    await submit.click();
    expect(calls).toBe(0);
    await expect(page.getByText(/Check .* for your sign-in link/)).toHaveCount(0);
  });

  test("valid email shows the 'check your inbox' confirmation", async ({ page }) => {
    await page.route("**/auth/v1/otp**", (r) => r.fulfill({ status: 200, json: {} }));
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill("qa@example.com");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("qa@example.com")).toBeVisible();
    await expect(page.getByText(/for your sign-in link/)).toBeVisible();
  });

  test("backend rate-limit error is shown and the form can be retried", async ({ page }) => {
    await page.route("**/auth/v1/otp**", (r) => r.fulfill({ status: 429, json: { code: 429, msg: "Email rate limit exceeded" } }));
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill("qa@example.com");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(appAlert(page)).toContainText(/rate limit/i);
    await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeEnabled();
  });

  test("network failure while sending the link shows a network error", async ({ page }) => {
    await page.route("**/auth/v1/otp**", (r) => r.abort("internetdisconnected"));
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill("qa@example.com");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(appAlert(page)).toContainText(/internet|connection|network/i);
  });

  test("?error=auth shows the sign-in failure message", async ({ page }) => {
    await page.goto("/?error=auth");
    await expect(page.getByText("Sign-in didn't complete. Please try again.")).toBeVisible();
  });
});

guestTest.describe("Landing page (signed in as guest)", () => {
  guestTest("redirects a signed-in user to the dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/dashboard");
  });

  guestTest("honours a safe ?next= path", async ({ page }) => {
    await page.goto("/?next=/posts/new");
    await page.waitForURL("**/posts/new");
  });

  guestTest("ignores an off-site ?next= (open-redirect protection)", async ({ page }) => {
    for (const evil of ["//evil.example.com", "https://evil.example.com", "/\\evil.example.com", "/%5Cevil.example.com", "/\t/evil.example.com"]) {
      await page.goto(`/?next=${encodeURIComponent(evil)}`, { waitUntil: "commit" }).catch(() => {});
      // Let the client-side redirect settle, then make sure we never left the site.
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      expect(new URL(page.url()).hostname, `next=${evil} ended at ${page.url()}`).toBe("localhost");
    }
  });
});
