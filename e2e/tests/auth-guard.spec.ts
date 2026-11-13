import { anonTest as test, expect, seed } from "../fixtures/test";

test.describe("Unauthorized access (signed out)", () => {
  for (const path of ["/dashboard", "/audit/new", "/posts/new"]) {
    test(`${path} redirects to the landing page with ?next`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/\\?next=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
      await expect(page.getByRole("button", { name: /Audit my profile, free/ })).toBeVisible();
    });
  }

  test("another user's audit is not viewable when signed out", async ({ page }) => {
    await page.goto(`/audit/${seed().auditId}`);
    await expect(page).toHaveURL(/\/\?next=/);
  });

  test("another user's post is not viewable when signed out", async ({ page }) => {
    await page.goto(`/posts/${seed().postId}`);
    await expect(page).toHaveURL(/\/\?next=/);
  });

  test("audit API returns 401 JSON without a session", async ({ request }) => {
    const res = await request.post("/api/audit", { multipart: { profileType: "personal", goal: "x", idealCustomer: "y" } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Please sign in." });
  });

  test("posts API returns 401 JSON without a session", async ({ request }) => {
    const res = await request.post("/api/posts", { data: { scenario: "x".repeat(40) } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Please sign in." });
  });

  test("settings API returns 401 without a session", async ({ request }) => {
    expect((await request.get("/api/settings")).status()).toBe(401);
    expect((await request.put("/api/settings", { data: { offer: "x" } })).status()).toBe(401);
  });

  test("meeting API returns 401 JSON without a session", async ({ request }) => {
    const res = await request.post("/api/meeting", { multipart: { transcriptText: "x".repeat(300) } });
    expect(res.status()).toBe(401);
  });

  test("auth callback without a code redirects with an error", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/\?error=auth/);
    await expect(page.getByText("Sign-in didn't complete")).toBeVisible();
  });

  test("auth callback with an invalid code redirects with an error", async ({ page }) => {
    await page.goto("/auth/callback?code=not-a-real-code");
    await expect(page).toHaveURL(/\/\?error=auth/);
  });

  test("auth callback ignores an off-site ?next", async ({ request }) => {
    const res = await request.get("/auth/callback?code=bad&next=//evil.example.com", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(new URL(res.headers()["location"]).hostname).toBe("localhost");
  });

  test("sign-out route redirects home", async ({ request }) => {
    const res = await request.post("/auth/signout", { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(new URL(res.headers()["location"]).pathname).toBe("/");
  });

  test("unknown route shows a 404 page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/could not be found|404/i).first()).toBeVisible();
  });
});
