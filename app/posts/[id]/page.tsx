import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PostResultView } from "@/components/PostResultView";
import { SavedMeetingPost } from "@/components/SavedMeetingPost";
import { getUser } from "@/lib/supabase/server";
import type { GeneratedPost } from "@/lib/schemas";

async function PostPageContent({ params }: PageProps<"/posts/[id]">) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data } = await supabase.from("posts").select("scenario, result, created_at").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <>
      <AppHeader email={user?.email} signedIn={!!user} guest={!!user?.is_anonymous} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-8">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/dashboard" className="text-sm text-muted hover:text-text">← Dashboard</Link>
            <Link href={(data.result as GeneratedPost).meeting ? "/posts/new?mode=meeting" : "/posts/new"} className="btn-primary">＋ Create new post</Link>
          </div>
          <p className="mt-2 text-sm text-muted"><b className="text-text">Scenario:</b> {data.scenario}</p>
        </div>
        {(data.result as GeneratedPost).meeting ? <SavedMeetingPost result={data.result as GeneratedPost} /> : <PostResultView result={data.result as GeneratedPost} />}
      </main>
    </>
  );
}

export default function PostPage(props: PageProps<"/posts/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PostPageContent {...props} />
    </Suspense>
  );
}
