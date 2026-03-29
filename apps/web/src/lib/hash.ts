import { createHash, randomBytes } from "crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function generateExtensionToken(): { raw: string; hash: string; prefix: string } {
  const raw = `vh_${randomBytes(32).toString("base64url")}`;
  const hash = sha256Hex(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}
