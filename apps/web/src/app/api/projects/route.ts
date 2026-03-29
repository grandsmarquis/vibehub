import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT id, workspace_key, visibility, display_name, created_at, updated_at,
            (SELECT COUNT(*)::int FROM prompts p WHERE p.project_id = projects.id) AS prompt_count
     FROM projects
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [session.user.id],
  );

  return NextResponse.json({ projects: r.rows });
}
