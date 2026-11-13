// Meeting transcript helpers. Pure functions: safe on client and server, easy to test.

export const TRANSCRIPT_EXTENSIONS = [".txt", ".md", ".vtt", ".srt", ".docx", ".pdf"] as const;
export const TRANSCRIPT_ACCEPT = TRANSCRIPT_EXTENSIONS.join(",");
// 8 MB: request bodies pass through proxy.ts, which caps them at 10 MB including form overhead.
export const MAX_TRANSCRIPT_BYTES = 8 * 1024 * 1024;
export const MAX_TRANSCRIPT_CHARS = 200_000;
export const MIN_TRANSCRIPT_CHARS = 200;

export function transcriptExtension(name: string): (typeof TRANSCRIPT_EXTENSIONS)[number] | null {
  const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return (TRANSCRIPT_EXTENSIONS as readonly string[]).includes(ext ?? "") ? (ext as (typeof TRANSCRIPT_EXTENSIONS)[number]) : null;
}

const TIMESTAMP = /^\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?.*$/;

/**
 * Turns caption files (Zoom/Teams .vtt, .srt) into readable "Speaker: text" lines and tidies plain text.
 * Keeps speaker names, drops cue numbers, timestamps and WEBVTT headers, and merges consecutive lines by the same speaker.
 */
export function cleanTranscript(raw: string): string {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const looksLikeCaptions = /^WEBVTT/m.test(text) || /\n?\d+\n\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(text);
  if (!looksLikeCaptions) return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const out: { speaker: string; text: string }[] = [];
  let skippingNote = false;
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l) { skippingNote = false; continue; }
    if (skippingNote) continue;
    if (/^WEBVTT/.test(l) || /^(STYLE|REGION)$/.test(l)) continue;
    if (/^NOTE\b/.test(l)) { skippingNote = true; continue; }
    if (/^\d+$/.test(l) || TIMESTAMP.test(l)) continue;

    // "<v Jane Doe>Hello" (VTT voice tag) or "Jane Doe: Hello"
    let speaker = "";
    let body = l;
    const voice = l.match(/^<v(?:\.[^ >]+)?\s+([^>]+)>(.*)$/);
    const colon = l.match(/^([A-Z][\w .'’-]{0,40}):\s+(.*)$/);
    if (voice) [speaker, body] = [voice[1].trim(), voice[2]];
    else if (colon) [speaker, body] = [colon[1].trim(), colon[2]];
    body = body.replace(/<\/?[^>]+>/g, "").trim();
    if (!body) continue;

    const last = out[out.length - 1];
    if (last && (last.speaker === speaker || !speaker)) last.text += " " + body;
    else out.push({ speaker, text: body });
  }
  return out.map((t) => (t.speaker ? `${t.speaker}: ${t.text}` : t.text)).join("\n").trim();
}
