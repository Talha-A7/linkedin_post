"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/net-errors";
import { Chips, ErrorNote, type Choice } from "@/components/ui";
import { CompanyCopyGuide, CompanyUrlGuide, PdfGuide, PdfMissingGuide, PersonalPasteGuide, ProfileUrlGuide } from "@/components/guides";

type PType = "personal" | "company";

export type LinkedInIdentity = { firstName: string; hasPhoto: boolean } | null;

// LinkedIn redirects /in/me/ to the signed-in member's own profile, where "Resources → Save to PDF" lives.
const OWN_PROFILE_URL = "https://www.linkedin.com/in/me/";

const TYPES: Choice<PType>[] = [
  { value: "personal", label: "Personal profile", hint: "linkedin.com/in/…, for freelancers, consultants, founders" },
  { value: "company", label: "Company page", hint: "linkedin.com/company/…, your business's page" },
];

const GOALS: Record<PType, Choice<string>[]> = {
  personal: [
    { value: "Inbound client leads", label: "Inbound client leads", hint: "People DM or book a call" },
    { value: "Sales or discovery calls", label: "Sales / discovery calls" },
    { value: "Partnerships or investors", label: "Partnerships / investors" },
    { value: "Speaking, media or authority", label: "Speaking / authority" },
  ],
  company: [
    { value: "Demo requests", label: "Demo requests" },
    { value: "Inbound leads", label: "Inbound leads" },
    { value: "Hiring great people", label: "Hiring" },
    { value: "Brand awareness and trust", label: "Brand trust / awareness" },
  ],
};

const ICP_EXAMPLES: Record<PType, string[]> = {
  personal: ["Seed–Series A SaaS founders", "E-commerce brand owners ($1M–$20M)", "Marketing leaders at mid-size B2B companies"],
  company: ["HR directors at 200–2,000-person companies", "Operations managers in manufacturing", "Local small-business owners"],
};

const LOADING_LINES = [
  "Reading your profile…",
  "Looking at it like your ideal customer would…",
  "Scoring each section…",
  "Finding what's missing…",
  "Writing rewrites you can paste in…",
  "Checking character limits…",
];

export function AuditWizard({ linkedin = null }: { linkedin?: LinkedInIdentity }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<PType | "">("");
  const [goalChoice, setGoalChoice] = useState("");
  const [goalOther, setGoalOther] = useState("");
  const [icp, setIcp] = useState("");
  const [offer, setOffer] = useState("");
  const [proof, setProof] = useState("");
  const [mode, setMode] = useState<"pdf" | "paste">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);

  function pickFile(f: File | undefined | null) {
    setFileError("");
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setFileError("That isn't a PDF. On LinkedIn, use Resources → Save to PDF, then upload that file.");
    if (f.size > 5 * 1024 * 1024) return setFileError("That PDF is larger than 5 MB. LinkedIn profile PDFs are usually under 200 KB. Is this the right file?");
    setFile(f);
  }
  const [text, setText] = useState("");
  // LinkedIn sign-in tells us whether a photo is set, which the text-only PDF can't.
  const [visuals, setVisuals] = useState(linkedin?.hasPhoto ? "Has a profile photo. " : "");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");

  const goal = goalChoice === "other" ? goalOther.trim() : goalChoice;
  const effectiveMode = type === "company" ? "paste" : mode;

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 9000);
    return () => clearInterval(t);
  }, [busy]);

  const canNext1 = !!type;
  const canNext2 = goal.length > 1 && icp.trim().length > 1;
  const canSubmit = effectiveMode === "pdf" ? !!file : text.trim().length >= 50;

  async function submit() {
    setError("");
    setBusy(true);
    setLine(0);
    const fd = new FormData();
    fd.set("profileType", type);
    fd.set("goal", goal);
    fd.set("idealCustomer", icp);
    fd.set("offer", offer);
    fd.set("proof", proof);
    fd.set("visuals", visuals);
    if (effectiveMode === "pdf" && file) fd.set("pdf", file);
    else fd.set("profileText", text);
    try {
      const res = await fetch("/api/audit", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      router.push(`/audit/${body.id}`);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="card flex flex-col items-center gap-4 py-16 text-center">
        <span className="size-10 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-hidden />
        <p className="text-lg font-semibold" aria-live="polite">{LOADING_LINES[line]}</p>
        <p className="text-sm text-muted">A thorough audit takes about a minute. Keep this tab open.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Progress step={step} />

      {step === 1 && (
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">What are we optimizing?</h2>
          <Chips options={TYPES} value={type} onChange={(v) => { setType(v); setGoalChoice(""); }} />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <ProfileUrlGuide label="Not sure which you have?" />
            <CompanyUrlGuide />
          </div>
          <Nav onNext={() => setStep(2)} nextDisabled={!canNext1} />
        </section>
      )}

      {step === 2 && type && (
        <section className="card space-y-6">
          <div>
            <h2 className="text-xl font-semibold">What should LinkedIn do for you?</h2>
            <p className="text-sm text-muted">Your audit is judged against this. The more specific, the sharper the advice.</p>
          </div>

          <div>
            <span className="label">Main goal</span>
            <Chips options={[...GOALS[type], { value: "other", label: "Something else…" }]} value={goalChoice} onChange={setGoalChoice} />
            {goalChoice === "other" && (
              <input autoFocus className="input mt-2.5" value={goalOther} onChange={(e) => setGoalOther(e.target.value)} placeholder="e.g. Get booked for paid workshops" maxLength={300} />
            )}
          </div>

          <div>
            <label htmlFor="icp" className="label">Who exactly do you want more of?</label>
            <input id="icp" className="input" value={icp} onChange={(e) => setIcp(e.target.value)} maxLength={500}
              placeholder="Role, industry, company size, location, and the problem they have" />
            <div className="mt-2 flex flex-wrap gap-2">
              {ICP_EXAMPLES[type].map((ex) => (
                <button key={ex} type="button" onClick={() => setIcp(ex)} className="rounded-full border border-border px-3 py-1 text-xs hover:border-brand hover:text-brand">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="offer" className="label">What do you sell, and what should visitors do next? <span className="font-normal text-muted">(optional)</span></label>
            <input id="offer" className="input" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={800}
              placeholder="e.g. Brand identity projects; book a 20-min discovery call" />
          </div>

          <div>
            <label htmlFor="proof" className="label">Results or proof you can share <span className="font-normal text-muted">(optional, but powerful)</span></label>
            <textarea id="proof" rows={3} className="input" value={proof} onChange={(e) => setProof(e.target.value)} maxLength={2000}
              placeholder="Numbers, client names, ratings, awards. Include anything that isn't on your profile yet. We only use what you give us." />
          </div>

          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!canNext2} />
        </section>
      )}

      {step === 3 && type && (
        <section className="card space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Share your {type === "company" ? "company page" : "profile"}</h2>
            <p className="text-sm text-muted">
              LinkedIn doesn't let apps read profiles directly, so {type === "company" ? "paste your page content" : "upload your profile PDF or paste the text"}.
            </p>
          </div>

          {type === "personal" && (
            <Chips
              options={[
                { value: "pdf", label: "Upload PDF (recommended)", hint: "One click from LinkedIn on desktop" },
                { value: "paste", label: "Paste text", hint: "Copy your sections in" },
              ]}
              value={mode}
              onChange={(v) => setMode(v as "pdf" | "paste")}
            />
          )}

          {effectiveMode === "pdf" ? (
            <div className="space-y-3">
              <div className="flex justify-between gap-3"><span className="label mb-0">Your profile PDF</span><PdfGuide /></div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                <span className="flex-1">
                  {linkedin?.firstName ? `${linkedin.firstName}, open` : "Open"} your profile, click <b>Resources</b> → <b>Save to PDF</b>, then drop the file below.
                </span>
                <a href={OWN_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open my LinkedIn profile ↗</a>
              </div>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                  dragging ? "border-brand bg-brand-soft" : file ? "border-brand bg-brand-soft" : "border-border hover:border-muted"
                }`}
              >
                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
                <span className="text-2xl">📄</span>
                <span className="text-sm font-semibold">{file ? file.name : dragging ? "Drop it here" : "Drag your Profile.pdf here, or click to choose"}</span>
                <span className="text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB · click or drop to change` : "PDF from LinkedIn's “Save to PDF”, up to 5 MB"}</span>
              </label>
              {fileError && <ErrorNote>{fileError}</ErrorNote>}
              <div>
                <div className="flex justify-between gap-3">
                  <label htmlFor="visuals" className="label">Photo, banner, Featured and posts <span className="font-normal text-muted">(optional)</span></label>
                  <PdfMissingGuide />
                </div>
                <textarea id="visuals" rows={2} className="input" value={visuals} onChange={(e) => setVisuals(e.target.value)} maxLength={1000}
                  placeholder="e.g. Casual photo, default blue banner, nothing in Featured, last post 3 months ago, 'Open to work' is on" />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between gap-3">
                <label htmlFor="ptext" className="label">{type === "company" ? "Your company page content" : "Your profile content"}</label>
                {type === "company" ? <CompanyCopyGuide /> : <PersonalPasteGuide />}
              </div>
              <textarea id="ptext" rows={12} className="input font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} maxLength={40000}
                placeholder={type === "company" ? "Tagline, About, specialties, custom button, cover image, pinned + recent posts…" : "Headline, About, Experience, Skills, Recommendations…"} />
            </div>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}
          <Nav onBack={() => setStep(2)} onNext={submit} nextDisabled={!canSubmit} nextLabel="Run my audit" />
        </section>
      )}
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const labels = ["Profile type", "Goal & customer", "Share profile"];
  return (
    <ol className="flex gap-2">
      {labels.map((l, i) => (
        <li key={l} className="flex-1">
          <span className={`block h-1.5 rounded-full ${i < step ? "bg-brand" : "bg-border"}`} />
          <span className={`mt-1.5 block text-xs ${i + 1 === step ? "font-semibold" : "text-muted"}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

function Nav({ onBack, onNext, nextDisabled, nextLabel = "Continue" }: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex justify-between gap-3 pt-2">
      {onBack ? <button type="button" onClick={onBack} className="btn-ghost">Back</button> : <span />}
      <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-primary">
        {nextLabel}
      </button>
    </div>
  );
}
