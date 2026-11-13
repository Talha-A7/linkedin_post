import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SignIn } from "@/components/SignIn";
import { StartButton } from "@/components/StartButton";
import { getUser } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

const STEPS = [
  { n: "1", title: "Tell us your goal", body: "Personal profile or company page, and the customers you want more of." },
  { n: "2", title: "Upload your profile", body: "Save it to PDF from LinkedIn in one click. The ⓘ icons show you how." },
  { n: "3", title: "Get your audit", body: "A score, what's missing for your ideal buyer, and rewrites you can paste in." },
  { n: "4", title: "Write posts", body: "Describe a moment or a win and get an eye-catching post with 3 hooks to choose from." },
];

async function HomeContent({ searchParams }: PageProps<"/">) {
  const { user } = await getUser();
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (user) redirect(next);

  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:py-20">
        <section>
          <p className="mb-3 text-sm font-semibold text-brand">For freelancers, consultants and B2B teams</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Turn your LinkedIn into a magnet for the customers you actually want.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Find out what your ideal buyer sees, and doesn't see, in the 10 seconds they spend on your profile. Then fix it with rewrites you can paste in.
          </p>
          <div className="mt-6 flex flex-wrap items-start gap-3">
            <StartButton href="/audit/new">Audit my profile, free →</StartButton>
            <StartButton href="/posts/new" variant="ghost">Write a post</StartButton>
          </div>
          <p className="mt-2 text-sm text-muted">No sign-up needed. Just upload your LinkedIn PDF.</p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3 rounded-xl border border-border bg-surface p-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{s.n}</span>
                <span>
                  <b className="block text-sm">{s.title}</b>
                  <span className="text-sm text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col items-center gap-3 md:items-end">
          <p className="w-full max-w-sm text-sm font-semibold">Already have an account? Sign in to see your saved audits.</p>
          {sp.error === "auth" && <p className="text-sm text-bad">Sign-in didn't complete. Please try again.</p>}
          <SignIn next={next} />
        </section>
      </main>
    </>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent {...props} />
    </Suspense>
  );
}
