import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { CtaSettings } from "@/lib/schemas";
import { getCta } from "@/lib/settings";

// GET: the user's saved call to action. PUT: save it (empty offer = remove it).
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    return NextResponse.json({ cta: await getCta(supabase) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't load your settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = CtaSettings.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const urlIssue = parsed.error.issues.find((i) => i.path[0] === "url");
    return NextResponse.json({ error: urlIssue?.message ?? "Keep the offer under 200 characters." }, { status: 400 });
  }
  const cta = parsed.data;
  if (!cta.offer && cta.url) return NextResponse.json({ error: "Describe what you're offering, not just the link." }, { status: 400 });

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, cta_offer: cta.offer, cta_url: cta.url, cta_link_in_body: cta.linkInBody, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't save your call to action. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ cta: cta.offer ? cta : null });
}
