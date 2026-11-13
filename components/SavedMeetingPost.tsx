"use client";

import { useState } from "react";
import type { GeneratedPost } from "@/lib/schemas";
import { MeetingSummaryView } from "./MeetingSummaryView";
import { PostResultView } from "./PostResultView";

/** Saved meeting post: summary + every angle's post, switchable without another AI call. */
export function SavedMeetingPost({ result: saved }: { result: GeneratedPost }) {
  const [index, setIndex] = useState(saved.angle_index ?? 0);
  const current = saved.angle_posts?.[index] ?? saved;
  return (
    <>
      {saved.meeting && (
        <MeetingSummaryView
          meeting={saved.meeting}
          angleIndex={index}
          onUseAngle={saved.angle_posts ? setIndex : undefined}
          available={saved.angle_posts?.map(Boolean)}
        />
      )}
      <PostResultView key={current.post} result={current} />
    </>
  );
}
