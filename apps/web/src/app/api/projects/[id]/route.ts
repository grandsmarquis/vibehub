import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const visibility =
    b.visibility === "public" || b.visibility === "private"
      ? b.visibility
      : null;
  const displayName =
    typeof b.display_name === "string"
      ? b.display_name.slice(0, 200)
      : undefined;

  if (visibility === null && displayName === undefined) {
    return NextResponse.json(
      { error: "Nothing to update (visibility or display_name)" },
      { status: 400 },
    );
  }

  const pool = getPool();
  const r = await pool.query(
    `UPDATE projects SET
       visibility = COALESCE($3::project_visibility, visibility),
       display_name = COALESCE($4, display_name),
       updated_at = now()
     WHERE id = $1::uuid AND user_id = $2
     RETURNING id, workspace_key, visibility, display_name, updated_at`,
    [id, session.user.id, visibility, displayName ?? null],
  );

  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: r.rows[0] });
}
