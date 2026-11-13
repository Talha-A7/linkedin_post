export function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 70 ? "text-good border-good" : s >= 45 ? "text-warn border-warn" : "text-bad border-bad";
  return <span className={`grid size-11 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${color}`}>{score ?? "–"}</span>;
}
