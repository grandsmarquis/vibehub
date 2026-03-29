import { NextResponse } from "next/server";
import { getUserIdFromBearer } from "@/lib/bearer";
import { getPool } from "@/lib/db";

type RouteContext = { params: Promise<{ generationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getUserIdFromBearer(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { generationId } = await context.params;
  if (!generationId) {
    return NextResponse.json({ error: "Missing generation id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text : null;
  const inputTokens =
    typeof b.input_tokens === "number" && Number.isFinite(b.input_tokens)
      ? Math.floor(b.input_tokens)
      : null;
  const outputTokens =
    typeof b.output_tokens === "number" && Number.isFinite(b.output_tokens)
      ? Math.floor(b.output_tokens)
      : null;
  const totalTokens =
    typeof b.total_tokens === "number" && Number.isFinite(b.total_tokens)
      ? Math.floor(b.total_tokens)
      : null;

  const assistantBody =
    text === null
      ? null
      : text.length > 32000
        ? text.slice(0, 32000)
        : text;

  const rawCompletion =
    b.raw_completion !== undefined && b.raw_completion !== null
      ? JSON.stringify(b.raw_completion)
      : null;

  const pool = getPool();
  const genId = decodeURIComponent(generationId);
  const r = await pool.query(
    `UPDATE prompts SET
       assistant_body = COALESCE($3, assistant_body),
       input_tokens = COALESCE($4, input_tokens),
       output_tokens = COALESCE($5, output_tokens),
       total_tokens = COALESCE($6, total_tokens),
       raw_completion = COALESCE(CAST($7 AS jsonb), raw_completion),
       updated_at = now()
     WHERE user_id = $1 AND generation_id = $2
     RETURNING id, slug`,
    [
      userId,
      genId,
      assistantBody,
      inputTokens,
      outputTokens,
      totalTokens,
      rawCompletion,
    ],
  );

  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: r.rows[0].id, slug: r.rows[0].slug });
}
