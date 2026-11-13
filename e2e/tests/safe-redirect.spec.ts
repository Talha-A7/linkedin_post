import { test, expect } from "@playwright/test";
import { safeNextPath } from "../../lib/safe-redirect";

// Pure-function checks for the open-redirect guard used by the landing page and the auth callback.
test.describe("safeNextPath", () => {
  for (const ok of ["/dashboard", "/posts/new", "/audit/abc?x=1#y"]) {
    test(`allows ${ok}`, () => expect(safeNextPath(ok)).toBe(ok));
  }
  for (const bad of [undefined, null, 42, "", "dashboard", "//evil.com", "/\\evil.com", "/\\\\evil.com", "https://evil.com", "/\t/evil.com", "/\n/evil.com", "\\evil.com"]) {
    test(`rejects ${JSON.stringify(bad)}`, () => expect(safeNextPath(bad)).toBe("/dashboard"));
  }
});
