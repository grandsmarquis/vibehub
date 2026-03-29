#!/usr/bin/env node
/**
 * Cursor hooks: beforeSubmitPrompt | afterAgentResponse
 * Responds immediately, then uploads in a detached worker.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const p = path.join(os.homedir(), ".vibehub", "config.json");
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    return {
      apiUrl: String(j.apiUrl ?? "http://localhost:3000").replace(/\/+$/, ""),
      token: String(j.token ?? ""),
      enabled: j.enabled !== false,
    };
  } catch {
    return { apiUrl: "http://localhost:3000", token: "", enabled: true };
  }
}

function workspaceKey(roots) {
  if (!Array.isArray(roots) || roots.length === 0) {
    return null;
  }
  const r = String(roots[0])
    .replace(/\\/g, "/")
    .replace(/\/+$/, "") || "/";
  return createHash("sha256").update(r, "utf8").digest("hex");
}

async function readStdinAll() {
  const chunks = [];
  for await (const c of process.stdin) {
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function workerMain(tmpPath, event) {
  let raw;
  try {
    raw = readFileSync(tmpPath, "utf8");
    unlinkSync(tmpPath);
  } catch {
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const cfg = loadConfig();
  if (!cfg.enabled || !cfg.token) {
    return;
  }

  const key = workspaceKey(data.workspace_roots);
  if (!key) {
    return;
  }

  try {
    if (event === "beforeSubmitPrompt") {
      const body = {
        workspace_key: key,
        prompt: data.prompt,
        conversation_id: data.conversation_id ?? null,
        generation_id: data.generation_id,
        model: data.model ?? null,
        cursor_version: data.cursor_version ?? null,
        raw_submit: data,
      };
      await fetch(`${cfg.apiUrl}/api/v1/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.token}`,
        },
        body: JSON.stringify(body),
      });
    } else if (event === "afterAgentResponse") {
      const gid = encodeURIComponent(data.generation_id ?? "");
      if (!gid || gid === "undefined") {
        return;
      }
      const body = {
        text: data.text ?? null,
        input_tokens: data.input_tokens ?? null,
        output_tokens: data.output_tokens ?? null,
        total_tokens: data.total_tokens ?? null,
        raw_completion: data,
      };
      await fetch(`${cfg.apiUrl}/api/v1/prompts/by-generation/${gid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.token}`,
        },
        body: JSON.stringify(body),
      });
    }
  } catch {
    // fail silent — hooks must never throw to Cursor
  }
}

async function main() {
  const event = process.argv[2];

  if (event === "worker") {
    const tmp = process.argv[3];
    const ev = process.argv[4];
    await workerMain(tmp, ev);
    return;
  }

  const raw = await readStdinAll();

  if (event === "beforeSubmitPrompt") {
    process.stdout.write(JSON.stringify({ continue: true }));
  } else if (event === "afterAgentResponse") {
    process.stdout.write("{}");
  } else {
    process.exit(0);
    return;
  }

  const tmp = path.join(
    os.tmpdir(),
    `vibehub-${process.pid}-${Date.now()}.json`,
  );
  writeFileSync(tmp, raw, { mode: 0o600 });
  const script = path.join(__dirname, "hook.mjs");
  const child = spawn(
    process.execPath,
    [script, "worker", tmp, event],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

main().catch(() => process.exit(0));
