"use client";

import type { MeetingSummary } from "@/lib/schemas";
import { CopyButton } from "./ui";

function asText(m: MeetingSummary) {
  const lines = [m.title, "", m.overview, "", "Key points:", ...m.key_points.map((k) => `- ${k}`)];
  if (m.decisions.length) lines.push("", "Decisions:", ...m.decisions.map((d) => `- ${d}`));
  if (m.action_items.length) lines.push("", "Action items:", ...m.action_items.map((a) => `- ${a.owner}: ${a.task}${a.due ? ` (by ${a.due})` : ""}`));
  if (m.open_questions.length) lines.push("", "Open questions:", ...m.open_questions.map((q) => `- ${q}`));
  return lines.join("\n");
}

export function MeetingSummaryView({
  meeting,
  angleIndex = 0,
  onUseAngle,
  available,
}: {
  meeting: MeetingSummary;
  /** Which angle's post is showing; -1 before the posts are written. */
  angleIndex?: number;
  /** When provided, the other angles get a "Show this post" button (posts are already written). */
  onUseAngle?: (i: number) => void;
  /** Per angle: was its post written successfully? */
  available?: boolean[];
}) {
  return (
    <div className="space-y-5">
      {/* Collapsed by default: the post is what people came for; the full summary is one click away. */}
      <details className="card group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Meeting summary</p>
            <h2 className="text-xl font-semibold">{meeting.title}</h2>
            <p className="mt-1 text-sm text-muted">
              <span className="group-open:hidden">Show key points, decisions, action items and quotes</span>
              <span className="hidden group-open:inline">Hide summary</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Copying shouldn't open or close the section. */}
            <span onClick={(e) => e.preventDefault()}>
              <CopyButton text={asText(meeting)} />
            </span>
            <span aria-hidden className="grid size-8 place-items-center rounded-full border border-border text-muted transition-transform group-open:rotate-180">▾</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        <p className="leading-relaxed">{meeting.overview}</p>

        <Block title="Key points" items={meeting.key_points} />
        <Block title="Decisions" items={meeting.decisions} />
        {meeting.action_items.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Action items</h3>
            <ul className="space-y-1.5 text-sm">
              {meeting.action_items.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">{a.owner}</span>
                  <span>{a.task}{a.due && <span className="text-muted"> · by {a.due}</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {meeting.notable_quotes.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Notable quotes</h3>
            <ul className="space-y-2">
              {meeting.notable_quotes.map((q, i) => (
                <li key={i} className="border-l-2 border-brand pl-3 text-sm">
                  “{q.quote}” <span className="text-muted">({q.speaker})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Block title="Open questions" items={meeting.open_questions} />
        </div>
      </details>

      {meeting.privacy_notes.length > 0 && (
        <section className="card border-warn/50">
          <h3 className="mb-1.5 font-semibold">Check before posting</h3>
          <p className="mb-2 text-sm text-muted">The meeting was private and the post is public. Names and confidential details were left out of the post.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">{meeting.privacy_notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}

      {meeting.post_angles.length > 1 && (
        <section className="card">
          <h3 className="mb-1 font-semibold">Post angles from this meeting</h3>
          <p className="mb-3 text-sm text-muted">
            {angleIndex < 0 ? "We'll write a post for each angle, most distinctive first." : onUseAngle ? "We wrote a post for each angle. Switch to compare them." : "The highlighted angle is the post below."}
          </p>
          <ul className="space-y-2">
            {meeting.post_angles.map((a, i) => (
              <li key={i} className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${i === angleIndex ? "border-brand bg-brand-soft" : "border-border"}`}>
                <div className="min-w-0 flex-1 text-sm">
                  <b className="block">{a.headline}</b>
                  <span className="text-muted">{a.why}</span>
                </div>
                {i === angleIndex ? (
                  <span className="shrink-0 text-xs font-semibold text-brand">Current post</span>
                ) : onUseAngle && available?.[i] !== false ? (
                  <button type="button" onClick={() => onUseAngle(i)} className="btn-ghost shrink-0 px-4 py-1.5">Show this post</button>
                ) : onUseAngle ? (
                  <span className="shrink-0 text-xs text-muted">Couldn&apos;t write this one. Try &quot;Rewrite all angles&quot;</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
