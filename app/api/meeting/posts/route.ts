import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { MeetingPostsInput } from "@/lib/schemas";
import { runMeetingPosts } from "@/lib/claude";
import { errorResponse } from "@/lib/api-errors";
import { getCta } from "@/lib/settings";

// Step 2 of a meeting post: write one post per angle (in parallel) and save them together.
export const maxDuration = 300;

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = MeetingPostsInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const roleIssue = parsed.error.issues.some((i) => i.path[0] === "role");
    return NextResponse.json(
      { error: roleIssue ? "Tell us who's posting, so the post is written in your voice." : "The meeting summary is missing or invalid. Summarise the transcript again." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (!input.meeting.post_angles.length) {
    return NextResponse.json({ error: "No post angles were found in this meeting." }, { status: 400 });
  }

  try {
    const result = await runMeetingPosts(input, input.includeCta ? await getCta(supabase) : null);
    const angle = input.meeting.post_angles[result.angle_index ?? 0];
    const { data, error } = await supabase
      .from("posts")
      .insert({
        scenario: `Meeting: ${input.meeting.title}\n\n${angle?.scenario ?? ""}`.slice(0, 4000),
        goal: input.goal,
        tone: input.tone,
        result,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, result });
  } catch (err) {
    return errorResponse(err);
  }
}
