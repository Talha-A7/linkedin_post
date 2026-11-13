import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanTranscript, transcriptExtension } from "../../lib/transcript";
import { extractDocxText } from "../../lib/transcript-file";
import { FILES_DIR } from "../fixtures/paths";

// Pure-function checks for transcript reading (no browser, no AI).
test.describe("cleanTranscript", () => {
  test("Zoom/Teams .vtt: keeps speakers, drops timestamps and cue numbers, merges a speaker's lines", () => {
    const out = cleanTranscript(readFileSync(path.join(FILES_DIR, "meeting.vtt"), "utf8"));
    expect(out).not.toMatch(/WEBVTT|-->|^\d+$/m);
    expect(out.split("\n")[0]).toBe(
      "Sara Khan: Thanks everyone. Quick retro on the Northwind onboarding project before we close it out. Six weeks ago their onboarding took 41 days from signed contract to first live user. As of Friday it takes 6 days.",
    );
    expect(out).toContain("Omar Ali: The biggest change wasn't the software.");
    expect(out).toContain("Lina Park: What surprised me");
  });

  test(".srt with 'Name:' prefixes and comma milliseconds", () => {
    const srt = "1\n00:00:01,000 --> 00:00:04,000\nJane: Hello team.\n\n2\n00:00:04,500 --> 00:00:07,000\nJane: Second line.\n\n3\n00:00:07,500 --> 00:00:09,000\nAli: Reply here.\n";
    expect(cleanTranscript(srt)).toBe("Jane: Hello team. Second line.\nAli: Reply here.");
  });

  test("VTT NOTE blocks and BOM are removed", () => {
    const vtt = "﻿WEBVTT\n\nNOTE this is a comment\nspanning two lines\n\n00:00.000 --> 00:02.000\n<v Kim>Hi</v>\n";
    expect(cleanTranscript(vtt)).toBe("Kim: Hi");
  });

  test("plain text is tidied but otherwise kept", () => {
    expect(cleanTranscript("Jane: hi   \r\n\r\n\r\n\r\nAli: hello")).toBe("Jane: hi\n\nAli: hello");
  });

  test("Word .docx text is extracted", async () => {
    const out = await extractDocxText(readFileSync(path.join(FILES_DIR, "meeting.docx")));
    expect(out).toContain("Sara Khan: Thanks everyone.");
    expect(out).toContain("remove before you automate".replace("r", "R"));
  });

  test("accepted file extensions", () => {
    for (const ok of ["a.vtt", "B.SRT", "c.txt", "d.md", "e.docx", "f.pdf"]) expect(transcriptExtension(ok)).not.toBeNull();
    for (const bad of ["a.png", "b.mp3", "c", "d.doc", "e.vtt.exe"]) expect(transcriptExtension(bad)).toBeNull();
  });
});

test.describe("hookLabel (change 6)", () => {
  test("library formulas get 'code · name'; templates keep their own label once", async () => {
    const { hookLabel } = await import("../../lib/claude-labels");
    expect(hookLabel("F7")).toBe("F7 · Odd-Precision Money Ledger");
    expect(hookLabel("f21")).toBe("F21 · Number Paradox");
    expect(hookLabel("Story template")).toBe("Story template");
  });
});
