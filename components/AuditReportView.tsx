import Link from "next/link";
import { LIMITS, type AuditReport } from "@/lib/schemas";
import { CharCount, CopyButton } from "./ui";


export function AuditReportView({
  id,
  report,
  profileType,
  goal,
}: {
  id: string;
  report: AuditReport;
  profileType: "personal" | "company";
  goal: string;
}) {
  const lim = LIMITS[profileType];
  const headlineLabel = profileType === "company" ? "Tagline" : "Headline";

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="card flex flex-col gap-5 sm:flex-row sm:items-center">
        <BigScore score={Math.round(report.overall_score)} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{report.subject_name}</h1>
          <p className="mt-1 text-sm text-muted">
            <b className="text-text">Goal:</b> {goal} · <b className="text-text">Ideal customer:</b> {report.ideal_customer_summary}
          </p>
          <p className="mt-3 leading-relaxed">{report.headline_diagnosis}</p>
        </div>
      </section>

      {/* Section scores */}
      <section className="card">
        <H2>Section scores</H2>
        <ul className="divide-y divide-border">
          {report.sections.map((s) => (
            <li key={s.section} className="flex items-start gap-4 py-3">
              <SectionScore score={s.score} />
              <div>
                <b className="text-sm">{s.section}</b>
                <p className="text-sm text-muted">{s.verdict}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Top fixes */}
      <section className="card">
        <H2>Top 5 fixes, ranked by impact</H2>
        <ol className="space-y-4">
          {report.top_fixes.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-brand-ink">{i + 1}</span>
              <div className="text-sm leading-relaxed">
                <b className="text-base">{f.title}</b>
                <p className="text-muted">{f.why}</p>
                <p className="mt-1"><span className="font-semibold">Do this:</span> {f.how}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {report.missing.length > 0 && (
        <section className="card">
          <H2>What's missing entirely</H2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.missing.map((m) => (
              <li key={m.element} className="rounded-xl border border-border p-3.5 text-sm">
                <b>{m.element}</b>
                <p className="text-muted">{m.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rewrites */}
      <section className="card space-y-5">
        <H2>Ready-to-paste rewrites</H2>
        <p className="-mt-3 text-sm text-muted">Anything in [brackets] is for you to fill in. We never make up results.</p>

        <div>
          <h3 className="mb-2 font-semibold">{headlineLabel}: pick one</h3>
          <ul className="space-y-2">
            {report.rewrites.headlines.map((h, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">{h}</span>
                <span className="flex items-center gap-3"><CharCount text={h} limit={lim.headline} /><CopyButton text={h} /></span>
              </li>
            ))}
          </ul>
        </div>

        <Block title={profileType === "company" ? "About / overview" : "About section"} text={report.rewrites.about} limit={lim.about} />

        {report.rewrites.other.map((o, i) => (
          <Block key={i} title={o.field} text={o.text} note={o.note} />
        ))}
      </section>

      {report.keywords.length > 0 && (
        <section className="card">
          <H2>Keywords your customers search for</H2>
          <ul className="flex flex-wrap gap-2">
            {report.keywords.map((k) => (
              <li key={k.term} title={k.where} className="rounded-full border border-border px-3 py-1 text-sm">
                <b>{k.term}</b> <span className="text-muted">→ {k.where}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.needs_verification.length > 0 && (
        <section className="card border-warn/50">
          <H2>Check these yourself</H2>
          <p className="-mt-2 mb-3 text-sm text-muted">We couldn't see these in what you shared.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">{report.needs_verification.map((v) => <li key={v}>{v}</li>)}</ul>
        </section>
      )}

      <section className="card">
        <H2>Next steps</H2>
        <ul className="space-y-2 text-sm">
          {report.next_steps.map((s, i) => (
            <li key={i} className="flex gap-2.5"><input type="checkbox" className="mt-1 accent-[var(--brand)]" aria-label={s} />{s}</li>
          ))}
        </ul>
      </section>

      <section className="card flex flex-col items-start gap-3 bg-brand-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <b>Now give them a reason to visit.</b>
          <p className="text-sm text-muted">Write a post aimed at the same ideal customer.</p>
        </div>
        <Link href={`/posts/new?audit=${id}`} className="btn-primary">Write a post →</Link>
      </section>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold">{children}</h2>;
}

function Block({ title, text, limit, note }: { title: string; text: string; limit?: number; note?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="flex items-center gap-3">{limit && <CharCount text={text} limit={limit} />}<CopyButton text={text} /></span>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-4 font-sans text-sm leading-relaxed [overflow-wrap:anywhere]">{text}</pre>
      {note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

function BigScore({ score }: { score: number }) {
  const color = score >= 70 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--bad)";
  const deg = Math.max(0, Math.min(100, score)) * 3.6;
  return (
    <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${deg}deg, var(--border) 0)` }}>
      <div className="grid size-[92px] place-items-center rounded-full bg-surface text-center">
        <span><b className="block text-3xl leading-none">{score}</b><span className="text-xs text-muted">out of 100</span></span>
      </div>
    </div>
  );
}

function SectionScore({ score }: { score: number | null }) {
  if (score === null) return <span className="w-14 shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-center text-xs font-semibold text-warn">verify</span>;
  return <span className="w-14 shrink-0"><ScoreBadgeSmall score={score} /></span>;
}

function ScoreBadgeSmall({ score }: { score: number }) {
  const color = score >= 7 ? "bg-good/15 text-good" : score >= 4 ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad";
  return <span className={`block rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${color}`}>{Math.round(score)}/10</span>;
}

