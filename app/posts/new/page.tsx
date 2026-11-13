import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import { AppHeader } from "@/components/AppHeader";
import { getUser } from "@/lib/supabase/server";
import { PostComposer } from "./PostComposer";

async function NewPostContent({ searchParams }: PageProps<"/posts/new">) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();

  let auditId: string | undefined;
  let audience: string | undefined;
  if (typeof sp.audit === "string") {
    const { data } = await supabase.from("audits").select("id, ideal_customer").eq("id", sp.audit).maybeSingle();
    if (data) {
      auditId = data.id;
      audience = data.ideal_customer;
    }
  }

  return (
    <>
      <AppHeader email={user?.email} signedIn={!!user} guest={!!user?.is_anonymous} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">Write a post people stop for</h1>
        <p className="mb-6 text-muted">Describe a moment or upload a meeting transcript. Get 3 hooks plus a full post, ready to paste.</p>
        <PostComposer auditId={auditId} audience={audience} initialMode={sp.mode === "meeting" ? "meeting" : "moment"} />
      </main>
    </>
  );
}

export default function NewPost(props: PageProps<"/posts/new">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewPostContent {...props} />
    </Suspense>
  );
}
