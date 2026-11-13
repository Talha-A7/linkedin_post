import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SaveWorkBanner } from "@/components/SaveWorkBanner";
import { getUser } from "@/lib/supabase/server";
import type { GeneratedPost } from "@/lib/schemas";
import { ScoreBadge } from "@/components/ScoreBadge";

async function DashboardContent() {
  const { supabase, user } = await getUser();
  const [{ data: audits }, { data: posts }] = await Promise.all([
    supabase.from("audits").select("id, subject_name, profile_type, goal, overall_score, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("posts").select("id, scenario, result, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <>
      <AppHeader email={user?.email} signedIn={!!user} guest={!!user?.is_anonymous} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
        {user?.is_anonymous && <div className="mb-6"><SaveWorkBanner /></div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/audit/new" className="card group transition hover:border-brand">
            <span className="text-2xl">🔍</span>
            <h2 className="mt-2 text-lg font-semibold group-hover:text-brand">Audit my profile or page</h2>
            <p className="text-sm text-muted">Score it against your goal and ideal customer, and get rewrites you can paste in.</p>
          </Link>
          <Link href="/posts/new" className="card group transition hover:border-brand">
            <span className="text-2xl">✍️</span>
            <h2 className="mt-2 text-lg font-semibold group-hover:text-brand">Write a post</h2>
            <p className="text-sm text-muted">Describe a moment, win or lesson. Get a scroll-stopping post with 3 hooks.</p>
          </Link>
          <Link href="/posts/new?mode=meeting" className="card group transition hover:border-brand">
            <span className="text-2xl">🎙️</span>
            <h2 className="mt-2 text-lg font-semibold group-hover:text-brand">Post from a meeting</h2>
            <p className="text-sm text-muted">Upload a transcript. Get a meeting summary and a post about what mattered.</p>
          </Link>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your audits</h2>
          {audits?.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {audits.map((a) => (
                <li key={a.id}>
                  <Link href={`/audit/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                    <ScoreBadge score={a.overall_score} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{a.subject_name || "Untitled"}</b>
                      <span className="block truncate text-xs text-muted">
                        {a.profile_type === "company" ? "Company page" : "Personal profile"} · {a.goal}
                      </span>
                    </span>
                    <time className="text-xs text-muted">{new Date(a.created_at).toLocaleDateString()}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No audits yet. Start with one to see what's missing.</Empty>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your posts</h2>
          {posts?.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/posts/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{(p.result as GeneratedPost).meeting ? "🎙️ " : ""}{(p.result as GeneratedPost).post.split("\n")[0]}</span>
                    <time className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString()}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No posts yet.</Empty>
          )}
        </section>
      </main>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted">{children}</p>;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
