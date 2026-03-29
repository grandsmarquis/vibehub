import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromptBySlugForViewer } from "@/lib/queries/prompts";

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
    <div className="rounded-lg bg-base-200 px-3 py-2">
      <div className="text-base-content/60 text-xs uppercase">{label}</div>
      <div className="font-mono text-sm">{display}</div>
    </div>
  );
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prompt = await getPromptBySlugForViewer(slug);
  if (!prompt) {
    notFound();
  }

  return (
    <article className="space-y-6">
      <Link href="/" className="link link-hover text-sm">
        ← Back to feed
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{prompt.title}</h1>
        <p className="text-base-content/60 text-sm">
          {prompt.author_name ?? "Anonymous"} ·{" "}
          {new Date(prompt.created_at).toLocaleString()}
          {prompt.visibility === "private" ? (
            <span className="badge badge-warning badge-sm ml-2">Private</span>
          ) : null}
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Model" value={prompt.model} />
        <Stat label="Input tokens" value={prompt.input_tokens} />
        <Stat label="Output tokens" value={prompt.output_tokens} />
        <Stat label="Total tokens" value={prompt.total_tokens} />
        <Stat label="Cursor version" value={prompt.cursor_version} />
        <Stat label="Views" value={prompt.view_count} />
        <Stat label="Conversation" value={prompt.conversation_id} />
        <Stat label="Generation" value={prompt.generation_id} />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Prompt</h2>
        <pre className="bg-base-200 border border-base-300 rounded-box whitespace-pre-wrap p-4 text-sm leading-relaxed">
          {prompt.body}
        </pre>
      </section>

      {prompt.assistant_body ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Assistant (truncated)</h2>
          <pre className="bg-base-200 border border-base-300 rounded-box max-h-[32rem] overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed">
            {prompt.assistant_body}
          </pre>
        </section>
      ) : null}
    </article>
  );
}
