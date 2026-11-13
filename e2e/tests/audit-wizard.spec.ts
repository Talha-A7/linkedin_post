import { test, expect, seed } from "../fixtures/test";
import { AuditWizardPage } from "../pages/AuditWizardPage";

test.describe("Audit wizard: step 1 (profile type)", () => {
  test("Continue is disabled until a profile type is chosen", async ({ page, pageErrors }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await expect(w.continueBtn()).toBeDisabled();
    await page.getByRole("radio", { name: /Personal profile/ }).click();
    await expect(page.getByRole("radio", { name: /Personal profile/ })).toHaveAttribute("aria-checked", "true");
    await expect(w.continueBtn()).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });

  test("ⓘ popups open and close with ×, Escape and a backdrop click", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    const help = page.getByRole("button", { name: "Help: Find your profile link" });
    const dialog = page.getByRole("dialog", { name: "Find your profile link" });

    await help.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await help.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await help.click();
    await page.mouse.click(5, 5); // outside the dialog box = backdrop
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Help: Find your company page link" }).click();
    await expect(page.getByRole("dialog", { name: "Find your company page link" })).toContainText("linkedin.com/company");
  });
});

test.describe("Audit wizard: step 2 (goal & customer)", () => {
  test("Continue needs a goal and an ideal customer", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await expect(w.continueBtn()).toBeDisabled();
    await page.getByRole("radio", { name: /Inbound client leads/ }).click();
    await expect(w.continueBtn()).toBeDisabled();
    await page.getByLabel("Who exactly do you want more of?").fill("x"); // 1 char is too short
    await expect(w.continueBtn()).toBeDisabled();
    await page.getByLabel("Who exactly do you want more of?").fill("Seed-stage SaaS founders");
    await expect(w.continueBtn()).toBeEnabled();
  });

  test("whitespace-only ideal customer does not count", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await page.getByRole("radio", { name: /Inbound client leads/ }).click();
    await page.getByLabel("Who exactly do you want more of?").fill("      ");
    await expect(w.continueBtn()).toBeDisabled();
  });

  test("example chips fill the ideal-customer field", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await page.getByRole("button", { name: "Seed–Series A SaaS founders" }).click();
    await expect(page.getByLabel("Who exactly do you want more of?")).toHaveValue("Seed–Series A SaaS founders");
  });

  test("'Something else…' needs a typed goal", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await page.getByRole("radio", { name: /Something else/ }).click();
    await page.getByLabel("Who exactly do you want more of?").fill("Founders");
    await expect(w.continueBtn()).toBeDisabled();
    await page.getByPlaceholder("e.g. Get booked for paid workshops").fill("Get booked for workshops");
    await expect(w.continueBtn()).toBeEnabled();
  });

  test("company pages offer company goals and examples", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Company page");
    await expect(page.getByRole("radio", { name: "Demo requests" })).toBeVisible();
    await expect(page.getByRole("button", { name: /HR directors/ })).toBeVisible();
  });

  test("Back keeps every answer", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal({ icp: "Founders in fintech", offer: "Brand sprints", proof: "Payfly rebrand" });
    await w.backBtn().click();
    await expect(page.getByLabel("Who exactly do you want more of?")).toHaveValue("Founders in fintech");
    await expect(page.getByLabel(/What do you sell/)).toHaveValue("Brand sprints");
    await expect(page.getByLabel(/Results or proof/)).toHaveValue("Payfly rebrand");
    await w.backBtn().click();
    await expect(page.getByRole("radio", { name: /Personal profile/ })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Audit wizard: step 3 (share profile)", () => {
  test("PDF is the default; Run is disabled until a file is chosen", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await expect(page.getByRole("radio", { name: /Upload PDF/ })).toHaveAttribute("aria-checked", "true");
    await expect(w.runBtn()).toBeDisabled();
    await w.uploadPdf();
    await expect(page.locator("label:has(input[type=file])")).toContainText("Profile.pdf");
    await expect(page.getByText(/KB · click or drop to change/)).toBeVisible();
    await expect(w.runBtn()).toBeEnabled();
  });

  test("a non-PDF file is refused with guidance", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await w.uploadPdf("notes.txt");
    await expect(w.alert()).toContainText("That isn't a PDF");
    await expect(w.runBtn()).toBeDisabled();
  });

  test("a PDF over 5 MB is refused", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await w.fileInput().setInputFiles({ name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(6 * 1024 * 1024) });
    await expect(w.alert()).toContainText("larger than 5 MB");
    await expect(w.runBtn()).toBeDisabled();
  });

  test("a valid file replaces an earlier error", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await w.uploadPdf("notes.txt");
    await expect(w.alert()).toBeVisible();
    await w.uploadPdf();
    await expect(w.alert()).toHaveCount(0);
    await expect(w.runBtn()).toBeEnabled();
  });

  test("drag and drop of a PDF works", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    const zone = page.locator("label:has(input[type=file])");
    const dt = await page.evaluateHandle(() => {
      const d = new DataTransfer();
      d.items.add(new File(["%PDF-1.4\n%%EOF"], "Dropped.pdf", { type: "application/pdf" }));
      return d;
    });
    await zone.dispatchEvent("dragover", { dataTransfer: dt });
    await expect(page.getByText("Drop it here")).toBeVisible();
    await zone.dispatchEvent("drop", { dataTransfer: dt });
    await expect(zone).toContainText("Dropped.pdf");
    await expect(w.runBtn()).toBeEnabled();
  });

  test("the PDF help and 'what the PDF leaves out' popups open", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await page.getByRole("button", { name: "Help: Download your profile as a PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Download your profile as a PDF" })).toContainText("Save to PDF");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Help: What the PDF leaves out" }).click();
    await expect(page.getByRole("dialog", { name: "What the PDF leaves out" })).toContainText("Banner");
  });

  test("paste mode needs at least 50 characters", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await w.pasteText("Short text");
    await expect(w.runBtn()).toBeDisabled();
    await w.pasteText("Headline: Brand designer for SaaS founders. About: I build identities that raise rounds.");
    await expect(w.runBtn()).toBeEnabled();
  });

  test("company pages only offer paste, with the company guide", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Company page");
    await w.fillGoal({ goal: "Demo requests", icp: "HR directors" });
    await expect(page.getByRole("radio", { name: /Upload PDF/ })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your company page content" })).toBeVisible();
    await page.getByRole("button", { name: "Help: Copy your company page content" }).click();
    await expect(page.getByRole("dialog")).toContainText("Tagline");
  });
});

test.describe("Audit wizard: submitting", () => {
  test("success shows the loading state, then the saved report", async ({ page, api, pageErrors }) => {
    await api.succeed("/api/audit", 2500);
    const w = new AuditWizardPage(page);
    await w.toReadyPersonalPdf();
    await w.runBtn().click();
    await expect(page.getByText("Reading your profile…")).toBeVisible();
    await page.waitForURL(`**/audit/${seed().auditId}`);
    await expect(page.getByRole("heading", { name: "E2E Test Profile" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("sends every answer and the PDF as multipart form data", async ({ page, api }) => {
    const calls = await api.capture("/api/audit");
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal({ icp: "Fintech founders", offer: "Brand sprints", proof: "Payfly rebrand" });
    await w.uploadPdf();
    await page.getByLabel(/Photo, banner, Featured and posts/).fill("Default banner");
    await w.runBtn().click();
    await page.waitForURL("**/audit/**");
    expect(calls).toHaveLength(1);
    expect(calls[0].multipart).toBe(true);
    for (const v of ["personal", "Inbound client leads", "Fintech founders", "Brand sprints", "Payfly rebrand", "Default banner", "Profile.pdf"]) {
      expect(calls[0].postData).toContain(v);
    }
  });

  const errors: [string, Parameters<import("../fixtures/test").ApiMock["fail"]>[1], RegExp][] = [
    ["400 validation error", { kind: "status", status: 400, body: { error: "Some answers are missing or too long." } }, /missing or too long/],
    ["401 expired session", { kind: "status", status: 401, body: { error: "Please sign in." } }, /sign in/i],
    ["422 AI declined", { kind: "status", status: 422, body: { error: "We couldn't process this request." } }, /couldn't process/],
    ["429 busy", { kind: "status", status: 429, body: { error: "We're busy right now." } }, /busy/],
    ["500 server error", { kind: "status", status: 500, body: { error: "Something went wrong. Please try again." } }, /went wrong/],
    ["502 AI unavailable", { kind: "status", status: 502, body: { error: "The AI service is unavailable." } }, /unavailable/],
    ["504 HTML gateway page (non-JSON)", { kind: "html", status: 504 }, /went wrong|try again/i],
    ["dropped connection / offline", { kind: "abort" }, /internet|connection|network/i],
  ];

  for (const [name, failure, message] of errors) {
    test(`${name}: shows an error, keeps the answers and allows a retry`, async ({ page, api, pageErrors }) => {
      await api.fail("/api/audit", failure);
      const w = new AuditWizardPage(page);
      await w.toReadyPersonalPdf();
      await w.runBtn().click();
      await expect(w.alert()).toContainText(message);
      // Still on step 3 with the file attached, so the user can just retry.
      await expect(page.locator("label:has(input[type=file])")).toContainText("Profile.pdf");
      await expect(w.runBtn()).toBeEnabled();
      await api.reset("/api/audit");
      await api.succeed("/api/audit");
      await w.runBtn().click();
      await page.waitForURL(`**/audit/${seed().auditId}`);
      expect(pageErrors).toEqual([]);
    });
  }

  test("browser goes offline before submitting: shows a network error", async ({ page, context }) => {
    const w = new AuditWizardPage(page);
    await w.toReadyPersonalPdf();
    await context.setOffline(true);
    await w.runBtn().click();
    await expect(w.alert()).toContainText(/internet|connection|network/i);
    await context.setOffline(false);
  });

  test("slow network: the loading screen stays up and the form can't be double-submitted", async ({ page, api }) => {
    let calls = 0;
    await page.route("**/api/audit", async (route) => {
      calls++;
      await new Promise((r) => setTimeout(r, 4000));
      await route.fulfill({ status: 200, json: { id: seed().auditId } });
    });
    const w = new AuditWizardPage(page);
    await w.toReadyPersonalPdf();
    await w.runBtn().click();
    await expect(page.getByText("A thorough audit takes about a minute")).toBeVisible();
    await expect(w.runBtn()).toHaveCount(0);
    await page.waitForURL(`**/audit/${seed().auditId}`);
    expect(calls).toBe(1);
    void api;
  });

  test("real server rejects a renamed text file (no AI call)", async ({ page }) => {
    const w = new AuditWizardPage(page);
    await w.open();
    await w.chooseType("Personal profile");
    await w.fillGoal();
    await w.uploadPdf("renamed-text.pdf");
    await w.runBtn().click();
    await expect(w.alert()).toContainText("isn't a PDF");
  });
});
