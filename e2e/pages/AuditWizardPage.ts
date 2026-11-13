import { expect, type Page } from "@playwright/test";
import path from "node:path";
import { FILES_DIR } from "../fixtures/paths";

export class AuditWizardPage {
  constructor(readonly page: Page) {}

  readonly continueBtn = () => this.page.getByRole("button", { name: "Continue" });
  readonly backBtn = () => this.page.getByRole("button", { name: "Back" });
  readonly runBtn = () => this.page.getByRole("button", { name: "Run my audit" });
  readonly fileInput = () => this.page.locator('input[type="file"]');
  readonly alert = () => this.page.locator('[role="alert"]:not(#__next-route-announcer__)');

  async open() {
    await this.page.goto("/audit/new");
    await expect(this.page.getByRole("heading", { name: "New LinkedIn audit" })).toBeVisible();
  }

  async chooseType(type: "Personal profile" | "Company page") {
    await this.page.getByRole("radio", { name: new RegExp(type) }).click();
    await this.continueBtn().click();
  }

  async fillGoal({ goal = "Inbound client leads", icp = "Seed-stage SaaS founders", offer = "", proof = "" } = {}) {
    await this.page.getByRole("radio", { name: new RegExp(goal) }).click();
    await this.page.getByLabel("Who exactly do you want more of?").fill(icp);
    if (offer) await this.page.getByLabel(/What do you sell/).fill(offer);
    if (proof) await this.page.getByLabel(/Results or proof/).fill(proof);
    await this.continueBtn().click();
  }

  async uploadPdf(name = "Profile.pdf") {
    await this.fileInput().setInputFiles(path.join(FILES_DIR, name));
  }

  async pasteText(text: string) {
    await this.page.getByRole("radio", { name: /Paste text/ }).click();
    await this.page.getByLabel("Your profile content").fill(text);
  }

  /** Goes from step 1 to a ready-to-submit step 3 with a PDF attached. */
  async toReadyPersonalPdf() {
    await this.open();
    await this.chooseType("Personal profile");
    await this.fillGoal();
    await this.uploadPdf();
    await expect(this.runBtn()).toBeEnabled();
  }
}
