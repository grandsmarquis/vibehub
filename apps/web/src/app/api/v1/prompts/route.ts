import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserIdFromBearer } from "@/lib/bearer";
import { getPool } from "@/lib/db";
import { titleFromBody } from "@/lib/prompt-title";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20),
  );
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

  const pool = getPool();
  const r = await pool.query(
    `SELECT p.id, p.slug, p.title, p.body, p.model, p.cursor_version,
            p.input_tokens, p.output_tokens, p.total_tokens, p.created_at,
            ps.view_count, u.name AS author_name, u.image AS author_image
     FROM prompts p
     INNER JOIN projects pr ON pr.id = p.project_id
     INNER JOIN users u ON u.id = p.user_id
     INNER JOIN prompt_stats ps ON ps.prompt_id = p.id
     WHERE pr.visibility = 'public'
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return NextResponse.json({ prompts: r.rows });
}

export async function POST(request: Request) {
  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const workspaceKey = typeof b.workspace_key === "string" ? b.workspace_key : "";
  const promptText =
    typeof b.prompt === "string"
      ? b.prompt
      : typeof b.body === "string"
        ? b.body
        : "";
  const generationId =
    typeof b.generation_id === "string" ? b.generation_id : "";

  if (!workspaceKey || !promptText || !generationId) {
    return NextResponse.json(
      { error: "workspace_key, prompt (or body), and generation_id are required" },
      { status: 400 },
    );
  }

  if (!/^[a-f0-9]{64}$/i.test(workspaceKey)) {
    return NextResponse.json(
      { error: "workspace_key must be a 64-char hex SHA-256" },
      { status: 400 },
    );
  }

  const conversationId =
    typeof b.conversation_id === "string" ? b.conversation_id : null;
  const model = typeof b.model === "string" ? b.model : null;
  const cursorVersion =
    typeof b.cursor_version === "string" ? b.cursor_version : null;
  const source =
    typeof b.source === "string" ? b.source : "cursor_hook";
  const rawSubmit =
    b.raw_submit !== undefined && b.raw_submit !== null
      ? JSON.stringify(b.raw_submit)
      : null;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const projectRes = await client.query<{ id: string }>(
      `INSERT INTO projects (user_id, workspace_key)
       VALUES ($1, $2)
       ON CONFLICT (user_id, workspace_key) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId, workspaceKey.toLowerCase()],
    );
    const projectId = projectRes.rows[0].id;

    const existing = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM prompts WHERE user_id = $1 AND generation_id = $2`,
      [userId, generationId],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return NextResponse.json({
        id: existing.rows[0].id,
        slug: existing.rows[0].slug,
        duplicate: true,
      });
    }

    const slug = nanoid(12);
    const title = titleFromBody(promptText);

    const ins = await client.query<{ id: string; slug: string }>(
      `INSERT INTO prompts (
         project_id, user_id, slug, title, body, source,
         conversation_id, generation_id, model, cursor_version, raw_submit
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb))
       RETURNING id, slug`,
      [
        projectId,
        userId,
        slug,
        title,
        promptText,
        source,
        conversationId,
        generationId,
        model,
        cursorVersion,
        rawSubmit,
      ],
    );

    await client.query(
      `INSERT INTO prompt_stats (prompt_id) VALUES ($1)`,
      [ins.rows[0].id],
    );

    await client.query("COMMIT");
    return NextResponse.json({
      id: ins.rows[0].id,
      slug: ins.rows[0].slug,
      duplicate: false,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
