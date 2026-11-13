import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { MeetingInput } from "@/lib/schemas";
import { summarizeMeeting } from "@/lib/claude";
import { errorResponse } from "@/lib/api-errors";
import { readTranscriptFile, TranscriptFileError } from "@/lib/transcript-file";
import { cleanTranscript, MAX_TRANSCRIPT_BYTES, MAX_TRANSCRIPT_CHARS, MIN_TRANSCRIPT_CHARS } from "@/lib/transcript";

// Step 1 of a meeting post: read the transcript and return the summary, the angles and
// one optional question per angle. Step 2 (/api/meeting/posts) writes the posts.
export const maxDuration = 300;

const TOO_BIG = "That file is larger than 8 MB. Trim the transcript or paste the relevant part.";
const TOO_LONG = "That transcript is too long (over 200,000 characters). Paste the part you want to post about.";

export async function POST(request: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  // Refuse oversized uploads before reading them (the proxy layer truncates bodies over 10 MB).
  if (Number(request.headers.get("content-length") ?? 0) > MAX_TRANSCRIPT_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: TOO_BIG }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "We couldn't read that upload. Try again, or paste the transcript text." }, { status: 400 });

  const parsed = MeetingInput.safeParse({
    audience: form.get("audience") ?? "",
    goal: form.get("goal") ?? undefined,
    formula: form.get("formula") ?? undefined,
    length: form.get("length") ?? undefined,
    tone: form.get("tone") ?? undefined,
    voiceSamples: form.get("voiceSamples") ?? "",
    role: form.get("role") ?? "",
    angleHint: form.get("angleHint") ?? "",
    transcriptText: form.get("transcriptText") ?? "",
    includeCta: form.get("includeCta") === "true",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue.path[0] === "transcriptText" && issue.code === "too_big" ? TOO_LONG
      : issue.path[0] === "role" ? "Tell us who's posting, so the post is written in your voice."
      : "Some options are invalid. Please check the form.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const input = parsed.data;

  let source: { text?: string; pdfBase64?: string };
  const file = form.get("file");
  try {
    if (file instanceof File && file.size > 0) source = await readTranscriptFile(file);
    else source = { text: cleanTranscript(input.transcriptText) };
  } catch (err) {
    if (err instanceof TranscriptFileError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  if (source.text !== undefined) {
    if (source.text.length < MIN_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: "That transcript is too short to summarise. Upload the full meeting or paste more of it." }, { status: 400 });
    }
    if (source.text.length > MAX_TRANSCRIPT_CHARS) return NextResponse.json({ error: TOO_LONG }, { status: 400 });
  }

  try {
    return NextResponse.json({ meeting: await summarizeMeeting(input, source) });
  } catch (err) {
    return errorResponse(err);
  }
}
