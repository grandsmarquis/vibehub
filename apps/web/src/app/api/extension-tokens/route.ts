import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generateExtensionToken } from "@/lib/hash";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT id, token_prefix, label, created_at, last_used_at, expires_at
     FROM extension_tokens
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [session.user.id],
  );

  return NextResponse.json({ tokens: r.rows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    if (request.headers.get("content-length") !== "0") {
      body = await request.json();
    }
  } catch {
    body = {};
  }
  const label =
    typeof (body as { label?: string }).label === "string"
      ? (body as { label: string }).label.slice(0, 100)
      : "";

  const { raw, hash, prefix } = generateExtensionToken();
  const pool = getPool();
  const r = await pool.query(
    `INSERT INTO extension_tokens (user_id, token_hash, token_prefix, label)
     VALUES ($1, $2, $3, $4)
     RETURNING id, token_prefix, label, created_at`,
    [session.user.id, hash, prefix, label],
  );

  return NextResponse.json({
    token: raw,
    id: r.rows[0].id,
    token_prefix: r.rows[0].token_prefix,
    label: r.rows[0].label,
    created_at: r.rows[0].created_at,
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query required" }, { status: 400 });
  }

  const pool = getPool();
  const r = await pool.query(
    `DELETE FROM extension_tokens WHERE id = $1::uuid AND user_id = $2 RETURNING id`,
    [id, session.user.id],
  );

  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
