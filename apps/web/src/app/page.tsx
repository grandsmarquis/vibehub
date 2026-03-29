import Link from "next/link";
import { listPublicPrompts } from "@/lib/queries/prompts";

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="flex flex-col">
      <span className="text-base-content/60 text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="font-mono text-sm">{display}</span>
    </div>
  );
}

export default async function HomePage() {
  const prompts = await listPublicPrompts(30, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Public prompts</h1>
        <p className="text-base-content/70">
          Prompts from projects marked public on Vibehub. Capture yours with the
          Cursor extension and hooks.
        </p>
      </header>

      {prompts.length === 0 ? (
        <div className="alert alert-info">
          <span>No public prompts yet. Sign in, create a project, and set it to public.</span>
        </div>
      ) : (
        <ul className="space-y-4">
          {prompts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.slug}`}
                className="card bg-base-200 border border-base-300 hover:border-primary/40 card-body block transition-colors"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="card-title line-clamp-2">{p.title}</h2>
                    <p className="text-base-content/70 line-clamp-2 text-sm">
                      {p.body}
                    </p>
                    <p className="text-base-content/50 text-xs">
                      {p.author_name ?? "Anonymous"} ·{" "}
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-2">
                    <Stat label="Model" value={p.model} />
                    <Stat label="Views" value={p.view_count} />
                    <Stat label="In / out / total" value={
                      p.input_tokens != null ||
                      p.output_tokens != null ||
                      p.total_tokens != null
                        ? `${p.input_tokens ?? "—"} / ${p.output_tokens ?? "—"} / ${p.total_tokens ?? "—"}`
                        : null
                    } />
                    <Stat label="Cursor" value={p.cursor_version} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
