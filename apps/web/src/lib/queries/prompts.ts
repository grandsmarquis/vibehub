import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";

export type PublicPromptListRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  model: string | null;
  cursor_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: Date;
  view_count: number;
  author_name: string | null;
  author_image: string | null;
};

export async function listPublicPrompts(
  limit: number,
  offset: number,
): Promise<PublicPromptListRow[]> {
  const pool = getPool();
  const r = await pool.query<PublicPromptListRow>(
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
  return r.rows;
}

export type PromptDetailRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  assistant_body: string | null;
  model: string | null;
  cursor_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  conversation_id: string | null;
  generation_id: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  view_count: number;
  copy_count: number;
  visibility: string;
  author_name: string | null;
  author_image: string | null;
};

export async function getPromptBySlugForViewer(
  slug: string,
): Promise<PromptDetailRow | null> {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const pool = getPool();
  const r = await pool.query<PromptDetailRow>(
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
    return null;
  }

  const isPublic = row.visibility === "public";
  const isOwner = Boolean(viewerId && row.user_id === viewerId);
  if (!isPublic && !isOwner) {
    return null;
  }

  if (isPublic) {
    await pool.query(
      `UPDATE prompt_stats SET view_count = view_count + 1 WHERE prompt_id = $1`,
      [row.id],
    );
    row.view_count += 1;
  }

  return row;
}
