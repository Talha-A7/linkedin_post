"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "@/lib/net-errors";
import { Chips, ErrorNote, Spinner } from "@/components/ui";
import { InfoButton } from "@/components/InfoButton";
import { PostResultView } from "@/components/PostResultView";
import { MeetingSummaryView } from "@/components/MeetingSummaryView";
import { CtaCard } from "@/components/CtaCard";
import { MAX_TRANSCRIPT_BYTES, MIN_TRANSCRIPT_CHARS, TRANSCRIPT_ACCEPT, transcriptExtension } from "@/lib/transcript";
import { FORMULAS, type PostGoal } from "@/lib/formulas";
import type { GeneratedPost, MeetingSummary } from "@/lib/schemas";

type Tone = "story" | "bold" | "professional";
type Length = "short" | "medium" | "long";
export type ComposerMode = "moment" | "meeting";

const EXAMPLES = [
  "Last month a founder came to me 3 weeks before their fundraise with a logo made in Canva. We did a full brand identity in 12 days. Two investors complimented the brand.",
  "We almost lost our biggest customer because our onboarding took 6 weeks. We cut it to 5 days by removing 3 steps nobody used.",
  "Our AI tooling bill for March was $873.47. It replaced a contractor we were paying $4,200 a month. The thing that broke first was our review process, not the code.",
];

const GOAL_OPTIONS: { value: PostGoal; label: string; hint: string }[] = [
  { value: "comments", label: "Comments", hint: "Start a conversation" },
  { value: "reposts", label: "Reposts", hint: "Quotable, shareable" },
  { value: "likes", label: "Likes", hint: "Emotional, warm" },
  { value: "saves", label: "Saves", hint: "Useful reference" },
  { value: "leads", label: "Leads", hint: "DMs from buyers" },
];

const STEPS = {
  questions: ["Reading your scenario…"],
  summary: ["Reading the transcript…", "Summarising the meeting…", "Finding the most distinctive angles…"],
  write: ["Picking the best hook formula…", "Drafting your post…", "Removing AI-sounding phrases…", "Final checks…"],
  writeMeeting: ["Writing a post for each angle…", "Removing AI-sounding phrases…", "Final checks…"],
} as const;
type BusyKind = keyof typeof STEPS;

const ROLE_CHOICES = ["I'm the CEO / founder", "I lead marketing", "I'm on the team", "I ran this meeting"];

type Question = { question: string; why: string };

export function PostComposer({ auditId, audience: initialAudience, initialMode = "moment" }: { auditId?: string; audience?: string; initialMode?: ComposerMode }) {
  const [mode, setMode] = useState<ComposerMode>(initialMode);
  const [scenario, setScenario] = useState("");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [pasteTranscript, setPasteTranscript] = useState(false);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [role, setRole] = useState("");
  const [angleHint, setAngleHint] = useState("");
  const [includeCta, setIncludeCta] = useState(false);
  const onCtaChange = useCallback((v: boolean) => setIncludeCta(v), []);
  const [audience, setAudience] = useState(initialAudience ?? "");
  const [goal, setGoal] = useState<PostGoal>(initialAudience ? "leads" : "comments");
  const [formula, setFormula] = useState("auto");
  const [length, setLength] = useState<Length>("medium");
  const [tone, setTone] = useState<Tone>("story");
  const [voiceSamples, setVoiceSamples] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [busy, setBusy] = useState<BusyKind | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "questions" | "result">("form");
  // Moment mode: the quick questions and the user's answers.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  // Meeting mode: the summary (step 1) and one answer per angle.
  const [meeting, setMeeting] = useState<MeetingSummary | null>(null);
  const [meetingAnswers, setMeetingAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<GeneratedPost | null>(null);

  const suggested = FORMULAS.filter((f) => (f.goals as readonly string[]).includes(goal));
  const others = FORMULAS.filter((f) => !(f.goals as readonly string[]).includes(goal));

  const meetingReady = (pasteTranscript ? transcriptText.trim().length >= MIN_TRANSCRIPT_CHARS : !!transcriptFile) && role.trim().length >= 2;
  const canGenerate = mode === "meeting" ? meetingReady : scenario.trim().length >= 20;
  const postOptions = { audience, goal, formula, length, tone, voiceSamples, includeCta };

  useEffect(() => {
    if (phase === "questions") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS[busy].length - 1)), 12000);
    return () => clearInterval(t);
  }, [busy]);

  function pickTranscript(f: File | null | undefined) {
    setFileError("");
    if (!f) return;
    if (!transcriptExtension(f.name)) return setFileError("Upload a .txt, .vtt, .srt, .md, .docx or .pdf transcript, or paste the text instead.");
    if (f.size > MAX_TRANSCRIPT_BYTES) return setFileError("That file is larger than 8 MB. Trim it, or paste the part you want to post about.");
    setTranscriptFile(f);
  }

  /** Runs one API step with the loading screen; returns the JSON body, or null after showing the error. */
  async function call<T>(kind: BusyKind, run: () => Promise<Response>): Promise<T | null> {
    setBusy(kind);
    setStep(0);
    setError("");
    try {
      const res = await run();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      return body as T;
    } catch (e) {
      setError(friendlyError(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const postJson = (url: string, body: unknown) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function showResult(r: GeneratedPost) {
    setResult(r);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ----- Describe a moment: (optional questions) → post
  async function writeMoment(withAnswers: string[]) {
    const answered = questions.map((q, i) => ({ question: q.question, answer: withAnswers[i] ?? "" })).filter((a) => a.answer.trim());
    const body = await call<{ result: GeneratedPost }>("write", () => postJson("/api/posts", { scenario, ...postOptions, answers: answered, auditId }));
    if (body) showResult(body.result);
  }

  async function startMoment() {
    setBusy("questions");
    setStep(0);
    setError("");
    let qs: Question[] = [];
    try {
      const res = await postJson("/api/posts/questions", { scenario, audience, goal });
      if (res.ok) qs = ((await res.json()).questions ?? []).slice(0, 2);
      else if (res.status === 401) {
        setError("Please sign in.");
        setBusy(null);
        return;
      }
      // Any other failure: the questions are optional, so go straight to writing.
    } catch {
      // Network failure here will also fail the write, which shows the error.
    }
    setBusy(null);
    setQuestions(qs);
    setAnswers(qs.map(() => ""));
    if (qs.length) setPhase("questions");
    else await writeMoment([]);
  }

  // ----- Meeting: summary (+ questions) → all angle posts
  async function writeMeeting(m: MeetingSummary, withAnswers: string[]) {
    const body = await call<{ result: GeneratedPost }>("writeMeeting", () =>
      postJson("/api/meeting/posts", { meeting: m, answers: withAnswers, role, ...postOptions }),
    );
    if (body) showResult(body.result);
  }

  async function startMeeting() {
    const body = await call<{ meeting: MeetingSummary }>("summary", () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries({ ...postOptions, includeCta: String(includeCta), role, angleHint })) fd.set(k, String(v));
      if (pasteTranscript) fd.set("transcriptText", transcriptText);
      else if (transcriptFile) fd.set("file", transcriptFile);
      return fetch("/api/meeting", { method: "POST", body: fd });
    });
    if (!body) return;
    setMeeting(body.meeting);
    const empty = body.meeting.post_angles.map(() => "");
    setMeetingAnswers(empty);
    if (body.meeting.post_angles.some((a) => a.question?.trim())) setPhase("questions");
    else await writeMeeting(body.meeting, empty);
  }

  /** Meeting posts: all angles were written together, so switching is instant. */
  function switchAngle(i: number) {
    const p = result?.angle_posts?.[i];
    if (!result?.meeting || !p) return;
    setResult({ ...p, meeting: result.meeting, angle_posts: result.angle_posts, angle_index: i });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** "Create new": clear this post's content but keep the user's preferences (role, audience, goal, tone, CTA…). */
  function startOver() {
    setScenario("");
    setTranscriptFile(null);
    setTranscriptText("");
    setFileError("");
    setAngleHint("");
    setQuestions([]);
    setAnswers([]);
    setMeeting(null);
    setMeetingAnswers([]);
    setResult(null);
    setError("");
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function tryAgain() {
    if (mode === "meeting" && meeting) writeMeeting(meeting, meetingAnswers);
    else writeMoment(answers);
  }

  if (busy && phase !== "result") {
    return (
      <div className="card flex flex-col items-center gap-4 py-16 text-center">
        <span className="size-10 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-hidden />
        <p className="text-lg font-semibold" aria-live="polite">{STEPS[busy][Math.min(step, STEPS[busy].length - 1)]}</p>
        <p className="text-sm text-muted">
          {busy === "questions" ? "A few seconds." : busy === "summary" ? "Usually under a minute." : busy === "writeMeeting" ? "Writing every angle at once: about a minute." : "Usually 30–60 seconds."}
        </p>
      </div>
    );
  }

  if (phase === "questions") {
    const meetingMode = mode === "meeting" && meeting;
    const items = meetingMode
      ? meeting.post_angles.map((a, i) => ({ i, title: a.headline, question: a.question, why: "" })).filter((x) => x.question?.trim())
      : questions.map((q, i) => ({ i, title: "", question: q.question, why: q.why }));
    const values = meetingMode ? meetingAnswers : answers;
    const setValue = (i: number, v: string) => (meetingMode ? setMeetingAnswers : setAnswers)((prev) => prev.map((x, j) => (j === i ? v : x)));
    const write = (skip: boolean) => {
      const sent = skip ? values.map(() => "") : values;
      if (meetingMode) writeMeeting(meeting, sent);
      else writeMoment(sent);
    };
    return (
      <div className="space-y-5">
        {/* Questionnaires always come first; the summary below is context. */}
        <section className="card space-y-5" aria-labelledby="questions-heading">
          <div>
            <h2 id="questions-heading" className="text-lg font-semibold">{meetingMode ? `Before we write ${meeting.post_angles.length} posts` : "Before we write"}: quick questions</h2>
            <p className="text-sm text-muted">Optional. Your answers give the post your opinion and reasons instead of a blank to fill in later.</p>
          </div>
          {items.map(({ i, title, question, why }) => (
            <div key={i}>
              {title && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">{title}</p>}
              <label htmlFor={`answer-${i}`} className="label">{question}</label>
              {why && <p className="-mt-1 mb-1.5 text-xs text-muted">{why}</p>}
              <textarea id={`answer-${i}`} rows={2} className="input" maxLength={1000} value={values[i] ?? ""} onChange={(e) => setValue(i, e.target.value)} placeholder="A sentence or two in your own words" />
            </div>
          ))}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => setPhase("form")} className="btn-ghost">← Back</button>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => write(true)} className="btn-ghost">Skip and write</button>
              <button type="button" onClick={() => write(false)} className="btn-primary">{meetingMode ? "Write the posts ✨" : "Write my post ✨"}</button>
            </div>
          </div>
        </section>
        {meetingMode && <MeetingSummaryView meeting={meeting} angleIndex={-1} />}
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{result.meeting ? "Your meeting posts are ready and saved to History." : "Your post is ready and saved to History."}</p>
          <button type="button" onClick={startOver} className="btn-primary">＋ Create new post</button>
        </div>
        {result.meeting && (
          <MeetingSummaryView meeting={result.meeting} angleIndex={result.angle_index ?? 0} onUseAngle={result.angle_posts ? switchAngle : undefined} available={result.angle_posts?.map(Boolean)} />
        )}
        <PostResultView key={result.post} result={result} />
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setPhase("form")} className="btn-ghost">{mode === "meeting" ? "← Change transcript" : "← Edit scenario"}</button>
          <button onClick={tryAgain} disabled={!!busy} className="btn-ghost">{busy && <Spinner />} {busy ? "Writing…" : mode === "meeting" ? "Rewrite all angles" : "Try another version"}</button>
          <button onClick={startOver} className="btn-ghost">＋ Create new post</button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    );
  }

  async function generate() {
    if (mode === "meeting") await startMeeting();
    else await startMoment();
  }

  return (
    <section className="card space-y-6">
      <div>
        <span className="label">Start from</span>
        <Chips<ComposerMode> value={mode} onChange={(m) => { setMode(m); setError(""); }} options={[
          { value: "moment", label: "Describe a moment", hint: "A win, a lesson, an opinion" },
          { value: "meeting", label: "A meeting transcript", hint: "We summarise it and write the post" },
        ]} />
      </div>

      {mode === "meeting" ? (
        <div className="space-y-5">
          <div>
            <div className="flex justify-between gap-3">
              <span className="label text-base">Your meeting transcript</span>
              <InfoButton title="Which transcripts work?" label="Which files?">
                <p>Export the transcript from your meeting tool and upload it:</p>
                <ol>
                  <li><b>Zoom / Microsoft Teams:</b> download the transcript (<code>.vtt</code>) from the recording.</li>
                  <li><b>Google Meet:</b> the transcript is saved to Google Docs. Use <b>File → Download → .docx</b>.</li>
                  <li><b>Otter, Fireflies, Fathom and similar:</b> export as <code>.txt</code>, <code>.docx</code> or <code>.pdf</code>.</li>
                </ol>
                <p>Or choose <b>Paste the text instead</b> and paste any part of a meeting.</p>
              </InfoButton>
            </div>
            {pasteTranscript ? (
              <>
                <textarea aria-label="Transcript text" rows={10} className="input font-mono text-xs" value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)}
                  maxLength={200000} placeholder={"Jane: Thanks for joining. Let's start with the onboarding numbers…\nAli: We cut setup from six weeks to five days…"} />
                <p className="mt-1 text-xs text-muted">{transcriptText.trim().length < MIN_TRANSCRIPT_CHARS ? `At least ${MIN_TRANSCRIPT_CHARS} characters` : `${transcriptText.length.toLocaleString()} characters`}</p>
              </>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pickTranscript(e.dataTransfer.files?.[0]); }}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging || transcriptFile ? "border-brand bg-brand-soft" : "border-border hover:border-muted"}`}
              >
                <input type="file" accept={TRANSCRIPT_ACCEPT} className="sr-only" onChange={(e) => pickTranscript(e.target.files?.[0])} />
                <span className="text-2xl">🎙️</span>
                <span className="text-sm font-semibold">{transcriptFile ? transcriptFile.name : dragging ? "Drop it here" : "Drag your transcript here, or click to choose"}</span>
                <span className="text-xs text-muted">{transcriptFile ? `${Math.max(1, Math.round(transcriptFile.size / 1024))} KB · click or drop to change` : ".vtt, .srt, .txt, .md, .docx or .pdf, up to 8 MB"}</span>
              </label>
            )}
            {fileError && <ErrorNote>{fileError}</ErrorNote>}
            <button type="button" onClick={() => { setPasteTranscript((p) => !p); setFileError(""); }} className="mt-2 text-sm font-medium text-brand hover:underline">
              {pasteTranscript ? "Upload a file instead" : "Paste the text instead"}
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="role" className="label">Who&apos;s posting? <span className="font-normal text-bad">*</span></label>
              <input id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={300} required aria-required="true" placeholder="e.g. I'm the CEO; I ran the call" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ROLE_CHOICES.map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full border px-2.5 py-0.5 text-xs ${role === r ? "border-brand text-brand" : "border-border hover:border-brand hover:text-brand"}`}>{r}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">The post is written in this person&apos;s voice, in the first person.</p>
            </div>
            <div>
              <label htmlFor="angle" className="label">What should the post be about? <span className="font-normal text-muted">(optional)</span></label>
              <input id="angle" className="input" value={angleHint} onChange={(e) => setAngleHint(e.target.value)} maxLength={500} placeholder="e.g. the onboarding lesson; OK to name the client" />
            </div>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
            <span aria-hidden>🔒</span>
            <span>Meetings are private, posts are public. The post leaves out people&apos;s names, clients and confidential numbers unless you say they&apos;re OK to share, and we list anything worth double-checking.</span>
          </p>
        </div>
      ) : (
      <div>
        <label htmlFor="scenario" className="label text-base">What happened? Describe the moment.</label>
        <p className="mb-2 text-sm text-muted">A client win, a mistake, a lesson, a launch, an opinion. Real numbers, dates and names make the strongest hooks. We never make them up.</p>
        <textarea id="scenario" rows={6} className="input" value={scenario} onChange={(e) => setScenario(e.target.value)} maxLength={4000}
          placeholder="e.g. A founder came to me 3 weeks before their raise…" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Try an example:</span>
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setScenario(ex)} className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-brand hover:text-brand">
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>
      )}

      <div>
        <label htmlFor="aud" className="label">Who should stop scrolling for this?</label>
        <input id="aud" className="input" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={300} placeholder="e.g. Seed-stage SaaS founders" />
        {auditId && <p className="mt-1 text-xs text-muted">Taken from your audit. Your positioning is used too.</p>}
      </div>

      <div>
        <div className="flex justify-between gap-3">
          <span className="label">What should this post earn?</span>
          <InfoButton title="Why pick a goal?" label="Why?">
            <p>Different post types earn different reactions. Stories get likes, contrarian takes and honest mistakes get comments, quotable lines and thank-yous get reposts, and frameworks or exact numbers get saves.</p>
            <p>LinkedIn weighs saves and thoughtful comments far more than likes, so pick the reaction you actually want and we'll choose the hook formula built for it.</p>
          </InfoButton>
        </div>
        <Chips<PostGoal> columns={3} value={goal} onChange={(g) => { setGoal(g); setFormula("auto"); }} options={GOAL_OPTIONS} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="flex justify-between gap-3">
            <label htmlFor="formula" className="label">Hook formula</label>
            <InfoButton title="What's a hook formula?" label="">
              <p>A proven structure for the opening line and the shape of the post, such as an exact cost breakdown, a contrarian take with evidence, or a named thank-you.</p>
              <p>Leave it on <b>Auto</b> and we'll pick the best fit for your story and goal. Formulas suggested for your goal are listed first.</p>
            </InfoButton>
          </div>
          <select id="formula" className="input" value={formula} onChange={(e) => setFormula(e.target.value)}>
            <option value="auto">✨ Auto: best fit for my story</option>
            <optgroup label="Suggested for this goal">
              {suggested.map((f) => <option key={f.code} value={f.code}>{f.name}: {f.bestFor}</option>)}
            </optgroup>
            <optgroup label="Other formulas">
              {others.map((f) => <option key={f.code} value={f.code}>{f.name}: {f.bestFor}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <span className="label">Length</span>
          <Chips<Length> columns={3} value={length} onChange={setLength} options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "long", label: "Long" },
          ]} />
        </div>
      </div>

      <div>
        <span className="label">Tone</span>
        <Chips<Tone> columns={3} value={tone} onChange={setTone} options={[
          { value: "story", label: "Story-driven" },
          { value: "bold", label: "Bold & direct" },
          { value: "professional", label: "Professional" },
        ]} />
      </div>

      <CtaCard onChange={onCtaChange} />

      <div className="rounded-xl border border-border">
        <button type="button" onClick={() => setShowVoice((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold">
          <span>Make it sound like me <span className="font-normal text-muted">(optional)</span></span>
          <span className="text-muted">{showVoice ? "−" : "+"}</span>
        </button>
        {showVoice && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-sm text-muted">Paste 1–3 posts you wrote yourself. We'll match your rhythm and word choice.</p>
            <textarea rows={6} className="input text-xs" value={voiceSamples} onChange={(e) => setVoiceSamples(e.target.value)} maxLength={6000}
              placeholder="Paste your past posts here, separated by a blank line" />
          </div>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end">
        <button onClick={generate} disabled={!!busy || !canGenerate} className="btn-primary">{mode === "meeting" ? "Summarise meeting ✨" : "Generate post ✨"}</button>
      </div>
    </section>
  );
}
