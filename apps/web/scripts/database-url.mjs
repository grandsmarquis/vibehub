/**
 * Builds a PostgreSQL connection URL for `pg` from DATABASE_URL and/or split vars.
 */

/**
 * @param {NodeJS.ProcessEnv} [e]
 * @returns {string}
 */
export function resolveDatabaseUrl(e = process.env) {
  const user = e.DATABASE_USER || e.DATABASE_USERNAME;
  const password = e.DATABASE_PASSWORD ?? "";
  const dbName = e.DATABASE_NAME;
  const explicit = e.DATABASE_URL?.trim();
  const wantSsl =
    e.DATABASE_SSL === "true" ||
    e.DATABASE_SSL === "1" ||
    e.PGSSLMODE === "require";

  function withSsl(url) {
    if (!wantSsl) {
      return url;
    }
    return url.includes("?")
      ? `${url}&sslmode=require`
      : `${url}?sslmode=require`;
  }

  // Split config: host/port in DATABASE_URL, credentials in DATABASE_USERNAME / DATABASE_PASSWORD / DATABASE_NAME
  if (explicit && user && dbName) {
    try {
      const normalized = explicit.replace(/^postgres(ql)?:\/\//i, "http://");
      const u = new URL(normalized);
      const host = u.hostname;
      if (!host) {
        throw new Error("DATABASE_URL has no hostname");
      }
      const port = u.port || "5432";
      const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
      return withSsl(base);
    } catch (err) {
      throw new Error(
        `Could not parse DATABASE_URL for split-variable mode: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Full URL with credentials (postgres://user:pass@host:port/db)
  if (explicit && /:\/\/[^/]+@/.test(explicit)) {
    const u = explicit.replace(/^postgres:\/\//i, "postgresql://");
    return withSsl(u);
  }

  // Host + name + user from individual vars (no DATABASE_URL)
  if (user && dbName) {
    const host = e.DATABASE_HOST || "localhost";
    const port = e.DATABASE_PORT || "5432";
    const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
    return withSsl(base);
  }

  if (explicit) {
    return withSsl(explicit.replace(/^postgres:\/\//i, "postgresql://"));
  }

  throw new Error(
    "Database configuration missing: set DATABASE_URL, or DATABASE_URL (host) + DATABASE_USERNAME + DATABASE_PASSWORD + DATABASE_NAME, or DATABASE_HOST + DATABASE_USERNAME + DATABASE_PASSWORD + DATABASE_NAME",
  );
}
