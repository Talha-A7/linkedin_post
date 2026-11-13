import "server-only";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeOutputError, ClaudeRefusalError } from "./claude";
import { ClaudeCodeError } from "./claude-code";

function isAccountProblem(err: InstanceType<typeof Anthropic.APIError>) {
  return /credit balance|billing|quota|spend limit/i.test(err.message);
}

export function errorResponse(err: unknown) {
  if (err instanceof ClaudeCodeError) {
    // Local development only (AI_PROVIDER=claude-code): show the real reason to the developer.
    console.error("Local Claude Code error:", err.message);
    const notLoggedIn = /not logged in|\/login/i.test(err.message);
    return NextResponse.json(
      { error: notLoggedIn ? "Local Claude isn't signed in. Run `claude` in a terminal and use /login." : `Local Claude error: ${err.message}` },
      { status: 503 },
    );
  }
  if (err instanceof ClaudeRefusalError) {
    return NextResponse.json({ error: "We couldn't process this request. Try rephrasing your answers." }, { status: 422 });
  }
  if (err instanceof ClaudeOutputError) {
    return NextResponse.json({ error: "The AI response was incomplete. Please try again." }, { status: 502 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "We're busy right now. Please try again in a minute." }, { status: 429 });
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError || (err instanceof Anthropic.BadRequestError && isAccountProblem(err))) {
    // Billing / key problems are ours to fix, not the user's: log loudly, show a neutral message.
    console.error("ANTHROPIC ACCOUNT PROBLEM (check API key and credit balance):", err.message);
    return NextResponse.json({ error: "The writing service is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error("Anthropic bad request:", err.message);
    return NextResponse.json({ error: "We couldn't read that content. Try pasting the text instead." }, { status: 400 });
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status}:`, err.message);
    return NextResponse.json({ error: "The AI service is unavailable. Please try again shortly." }, { status: 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
