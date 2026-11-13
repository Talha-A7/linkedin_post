import { readFileSync } from "node:fs";
import path from "node:path";

export const GUEST_STATE = "e2e/.auth/guest.json";
export const SEED_FILE = "e2e/.auth/seed.json";
export const FILES_DIR = path.resolve("e2e/fixtures/files");

export function seed(): { auditId: string; postId: string; meetingPostId: string; userId: string } {
  return JSON.parse(readFileSync(SEED_FILE, "utf8"));
}
