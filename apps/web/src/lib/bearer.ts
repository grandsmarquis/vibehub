import { getPool } from "@/lib/db";
import { sha256Hex } from "@/lib/hash";

export async function getUserIdFromBearer(
  request: Request,
): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const raw = header.slice(7).trim();
  if (!raw) {
    return null;
  }
  const hash = sha256Hex(raw);
  const pool = getPool();
  const r = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM extension_tokens WHERE token_hash = $1`,
    [hash],
  );
  if (r.rows.length === 0) {
    return null;
  }
  await pool.query(
    `UPDATE extension_tokens SET last_used_at = now() WHERE token_hash = $1`,
    [hash],
  );
  return r.rows[0].user_id;
}
