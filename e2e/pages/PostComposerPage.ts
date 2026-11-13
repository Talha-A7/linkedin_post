import { expect, type Page } from "@playwright/test";

export const VALID_SCENARIO = "A founder came to me 3 weeks before their raise with a Canva logo. We rebuilt the brand in 12 days.";

export class PostComposerPage {
  constructor(readonly page: Page) {}

  readonly scenario = () => this.page.getByLabel(/What happened\?/);
  readonly audience = () => this.page.getByLabel("Who should stop scrolling for this?");
  readonly formula = () => this.page.getByRole("combobox", { name: "Hook formula" });
  readonly generateBtn = () => this.page.getByRole("button", { name: /Generate post/ });
  readonly alert = () => this.page.locator('[role="alert"]:not(#__next-route-announcer__)');

  async open(query = "") {
    await this.page.goto(`/posts/new${query}`);
    await expect(this.page.getByRole("heading", { name: "Write a post people stop for" })).toBeVisible();
  }

  async fillAndGenerate(text = VALID_SCENARIO) {
    await this.scenario().fill(text);
    await this.generateBtn().click();
  }
}
