export function titleFromBody(body: string): string {
  const line = body.split(/\r?\n/).find((l) => l.trim().length > 0) ?? body;
  const t = line.trim().slice(0, 120);
  return t || "Untitled prompt";
}
