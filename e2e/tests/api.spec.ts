import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "../fixtures/test";
import { FILES_DIR } from "../fixtures/paths";

// Server-side validation, run as the seeded guest. Every request here is rejected
// before any Claude call, so these tests cost nothing.

test.describe("POST /api/audit validation", () => {
  const base = { profileType: "personal", goal: "Inbound client leads", idealCustomer: "Seed-stage SaaS founders" };

  test("rejects missing required answers", async ({ request }) => {
    const res = await request.post("/api/audit", { multipart: { profileType: "personal" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/missing or too long/);
  });

  test("rejects an unknown profile type", async ({ request }) => {
    const res = await request.post("/api/audit", { multipart: { ...base, profileType: "group" } });
    expect(res.status()).toBe(400);
  });

  test("rejects answers over the length limit", async ({ request }) => {
    const res = await request.post("/api/audit", { multipart: { ...base, goal: "g".repeat(301) } });
    expect(res.status()).toBe(400);
  });

  test("requires a PDF or at least 50 characters of pasted text", async ({ request }) => {
    const res = await request.post("/api/audit", { multipart: { ...base, profileText: "too short" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Upload your profile PDF or paste/);
  });

  test("rejects a text file renamed to .pdf (checks the file signature)", async ({ request }) => {
    const res = await request.post("/api/audit", {
      multipart: { ...base, pdf: { name: "Profile.pdf", mimeType: "application/pdf", buffer: readFileSync(path.join(FILES_DIR, "renamed-text.pdf")) } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/isn't a PDF/);
  });

  test("rejects a PDF larger than 5 MB", async ({ request }) => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024 + 10, 0x20)]);
    const res = await request.post("/api/audit", { multipart: { ...base, pdf: { name: "big.pdf", mimeType: "application/pdf", buffer: big } } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/larger than 5 MB/);
  });
});

test.describe("POST /api/posts validation", () => {
  const scenario = "A founder came to me 3 weeks before their raise with a Canva logo.";

  test("rejects a body that isn't JSON", async ({ request }) => {
    const res = await request.post("/api/posts", { headers: { "content-type": "application/json" }, data: "{not json" });
    expect(res.status()).toBe(400);
  });

  test("rejects a scenario under 20 characters", async ({ request }) => {
    const res = await request.post("/api/posts", { data: { scenario: "too short" } });
    expect(res.status()).toBe(400);
  });

  for (const [field, value] of [["goal", "virality"], ["formula", "F99"], ["length", "huge"], ["tone", "angry"], ["auditId", "not-a-uuid"]] as const) {
    test(`rejects an invalid ${field}`, async ({ request }) => {
      const res = await request.post("/api/posts", { data: { scenario, [field]: value } });
      expect(res.status()).toBe(400);
    });
  }

  test("rejects a scenario over 4,000 characters", async ({ request }) => {
    const res = await request.post("/api/posts", { data: { scenario: "s".repeat(4001) } });
    expect(res.status()).toBe(400);
  });
});


test.describe("POST /api/posts/questions validation (no AI cost)", () => {
  test("rejects a scenario under 20 characters", async ({ request }) => {
    const res = await request.post("/api/posts/questions", { data: { scenario: "too short" } });
    expect(res.status()).toBe(400);
  });
  test("rejects an invalid goal", async ({ request }) => {
    const res = await request.post("/api/posts/questions", { data: { scenario: "x".repeat(40), goal: "virality" } });
    expect(res.status()).toBe(400);
  });
  test("rejects a body that isn't JSON", async ({ request }) => {
    const res = await request.post("/api/posts/questions", { headers: { "content-type": "application/json" }, data: "{nope" });
    expect(res.status()).toBe(400);
  });
});

test.describe("POST /api/posts answers validation (no AI cost)", () => {
  const scenario = "A founder came to me 3 weeks before their raise with a Canva logo.";
  test("rejects more than 3 answers", async ({ request }) => {
    const a = { question: "q", answer: "a" };
    expect((await request.post("/api/posts", { data: { scenario, answers: [a, a, a, a] } })).status()).toBe(400);
  });
  test("rejects an answer over 1,000 characters", async ({ request }) => {
    expect((await request.post("/api/posts", { data: { scenario, answers: [{ question: "q", answer: "a".repeat(1001) }] } })).status()).toBe(400);
  });
});
