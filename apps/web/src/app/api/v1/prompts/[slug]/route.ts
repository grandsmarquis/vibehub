import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (!slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const pool = getPool();
  const r = await pool.query(
    `SELECT p.id, p.slug, p.title, p.body, p.assistant_body, p.model, p.cursor_version,
            p.input_tokens, p.output_tokens, p.total_tokens, p.conversation_id, p.generation_id,
            p.created_at, p.updated_at, p.user_id,
            ps.view_count, ps.copy_count, pr.visibility, u.name AS author_name, u.image AS author_image
     FROM prompts p
     INNER JOIN projects pr ON pr.id = p.project_id
     INNER JOIN users u ON u.id = p.user_id
     INNER JOIN prompt_stats ps ON ps.prompt_id = p.id
     WHERE p.slug = $1`,
    [slug],
  );

  const row = r.rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPublic = row.visibility === "public";
  const isOwner = viewerId && row.user_id === viewerId;
  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isPublic) {
    await pool.query(
      `UPDATE prompt_stats SET view_count = view_count + 1 WHERE prompt_id = $1`,
      [row.id],
    );
    row.view_count = (row.view_count ?? 0) + 1;
  }

  return NextResponse.json({ prompt: row });
}
