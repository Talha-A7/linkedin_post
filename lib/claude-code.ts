import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * LOCAL DEVELOPMENT ONLY: runs the app's AI calls through the local Claude Code CLI (`claude -p`),
 * signed in with the developer's own Claude subscription, instead of the API.
 *
 * A personal Claude subscription is for the subscriber's own use. Anything other people use
 * (staging, production) must use an ANTHROPIC_API_KEY. lib/claude.ts refuses this provider in production.
 */

export class ClaudeCodeError extends Error {}

const MODEL = process.env.CLAUDE_CODE_MODEL ?? "claude-opus-5-5";
const TIMEOUT_MS = 280_000; // under the routes' 300 s maxDuration

type Content = string | Anthropic.Beta.BetaContentBlockParam[];

export async function runClaudeCode<S extends z.ZodType>(
  schema: S,
  opts: { system: string; content: Content; effort: "low" | "medium" | "high"; label: string },
): Promise<z.infer<S>> {
  // Each call runs in its own empty folder: no project files or CLAUDE.md get pulled into the prompt.
  const dir = await mkdtemp(path.join(tmpdir(), "profile-pilot-claude-"));
  try {
    const parts: string[] = [];
    let files = 0;
    for (const block of typeof opts.content === "string" ? [{ type: "text" as const, text: opts.content }] : opts.content) {
      if (block.type === "text") parts.push(block.text);
      else if (block.type === "document" && block.source.type === "base64") {
        const file = path.join(dir, `attachment-${++files}.pdf`);
        await writeFile(file, Buffer.from(block.source.data, "base64"));
        parts.push(`The attached document is the PDF at ${file}. Read it with the Read tool before answering.`);
      }
    }
    const systemFile = path.join(dir, "system.txt");
    await writeFile(systemFile, opts.system);

    const args = [
      "-p",
      "--output-format", "json",
      "--json-schema", JSON.stringify(jsonSchema(schema)),
      "--system-prompt-file", systemFile,
      "--model", MODEL,
      "--effort", opts.effort,
      "--no-session-persistence",
      "--strict-mcp-config",
      // No tools at all, except reading the attached PDF when there is one.
      "--tools", files ? "Read" : "",
      ...(files ? ["--allowedTools", "Read", "--add-dir", dir] : []),
    ];

    const out = await run(args, parts.join("\n\n"), dir);
    let parsed: { is_error?: boolean; result?: string; structured_output?: unknown };
    try {
      parsed = JSON.parse(out);
    } catch {
      throw new ClaudeCodeError(`Local Claude returned something that isn't JSON for the ${opts.label}.`);
    }
    if (parsed.is_error || parsed.structured_output == null) {
      throw new ClaudeCodeError(`Local Claude failed on the ${opts.label}: ${parsed.result ?? "no structured output"}`);
    }
    return schema.parse(parsed.structured_output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The CLI validates schemas as draft-7 and rejects the 2020-12 "$schema" tag zod adds by default. */
function jsonSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

function run(args: string[], stdin: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Remove the API key so the CLI signs in with the developer's subscription, not the API account.
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;

    const child = spawn(process.env.CLAUDE_CODE_BIN ?? "claude", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new ClaudeCodeError("Local Claude took too long and was stopped."));
    }, TIMEOUT_MS);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new ClaudeCodeError(`Couldn't start the local Claude CLI (${err.message}). Is Claude Code installed and on PATH?`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (stdout.trim()) return resolve(stdout);
      reject(new ClaudeCodeError(`Local Claude exited with code ${code}: ${stderr.slice(0, 500)}`));
    });
    child.stdin.end(stdin);
  });
}
