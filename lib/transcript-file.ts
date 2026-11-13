// Server-side: reads an uploaded transcript file into text (or a PDF for Claude to read directly).
import mammoth from "mammoth";
import { cleanTranscript, MAX_TRANSCRIPT_BYTES, transcriptExtension } from "./transcript";

export class TranscriptFileError extends Error {}

export async function readTranscriptFile(file: File): Promise<{ text?: string; pdfBase64?: string }> {
  if (file.size > MAX_TRANSCRIPT_BYTES) throw new TranscriptFileError("That file is larger than 8 MB. Trim the transcript or paste the relevant part.");
  const ext = transcriptExtension(file.name);
  if (!ext) throw new TranscriptFileError("Upload a .txt, .vtt, .srt, .md, .docx or .pdf transcript, or paste the text.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (ext === ".pdf") {
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new TranscriptFileError("That file isn't a real PDF. Export the transcript again or paste the text.");
    return { pdfBase64: bytes.toString("base64") };
  }
  if (ext === ".docx") {
    if (bytes.subarray(0, 2).toString("latin1") !== "PK") throw new TranscriptFileError("That file isn't a real Word document. Export it again or paste the text.");
    return { text: await extractDocxText(bytes) };
  }
  // Plain-text formats: refuse binary files that were simply renamed.
  if (bytes.subarray(0, 4096).includes(0)) throw new TranscriptFileError("That file doesn't look like text. Export the transcript as .txt or .vtt.");
  return { text: cleanTranscript(bytes.toString("utf8")) };
}

export async function extractDocxText(bytes: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return cleanTranscript(value);
  } catch {
    throw new TranscriptFileError("We couldn't read that Word document. Save it again or paste the text.");
  }
}
