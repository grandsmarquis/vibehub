"use client";

import { useCallback, useEffect, useState } from "react";

type TokenRow = {
  id: string;
  token_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

type ProjectRow = {
  id: string;
  workspace_key: string;
  visibility: "public" | "private";
  display_name: string | null;
  prompt_count: number;
  updated_at: string;
};

export function SettingsClient() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [label, setLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tr, pr] = await Promise.all([
        fetch("/api/extension-tokens").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      if (tr.error) {
        throw new Error(tr.error);
      }
      if (pr.error) {
        throw new Error(pr.error);
      }
      setTokens(tr.tokens ?? []);
      setProjects(pr.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createToken() {
    setError(null);
    setNewToken(null);
    const r = await fetch("/api/extension-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Create failed");
      return;
    }
    setNewToken(data.token);
    setLabel("");
    await load();
  }

  async function revokeToken(id: string) {
    if (!confirm("Revoke this token? The extension will stop working until you paste a new one.")) {
      return;
    }
    setError(null);
    const r = await fetch(`/api/extension-tokens?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const data = await r.json();
      setError(data.error ?? "Revoke failed");
      return;
    }
    await load();
  }

  async function setProjectVisibility(id: string, visibility: "public" | "private") {
    setError(null);
    const r = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  async function saveProjectName(id: string, display_name: string) {
    setError(null);
    const r = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  if (loading) {
    return <span className="loading loading-spinner loading-lg" />;
  }

  return (
    <div className="space-y-10">
      {error ? (
        <div role="alert" className="alert alert-error text-sm">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Extension token</h2>
        <p className="text-base-content/70 text-sm">
          Paste this token into the Vibehub Cursor extension. Hooks read{" "}
          <code className="bg-base-200 rounded px-1">~/.vibehub/config.json</code>{" "}
          written by the extension.
        </p>
        {newToken ? (
          <div className="alert alert-success">
            <div className="w-full space-y-2">
              <p className="font-medium">Copy this token now — it will not be shown again.</p>
              <code className="bg-base-100 block w-full overflow-x-auto rounded p-3 text-xs break-all">
                {newToken}
              </code>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => void navigator.clipboard.writeText(newToken)}
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className="label-text text-xs">Label (optional)</span>
            <input
              className="input input-bordered input-sm w-full max-w-xs"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="MacBook"
            />
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void createToken()}>
            Create token
          </button>
        </div>
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="border-base-300 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                <code>{t.token_prefix}…</code>
                {t.label ? ` · ${t.label}` : null}
                <span className="text-base-content/50 ml-2">
                  {t.last_used_at
                    ? `Last used ${new Date(t.last_used_at).toLocaleString()}`
                    : "Never used"}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-error"
                onClick={() => void revokeToken(t.id)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        <p className="text-base-content/70 text-sm">
          Each workspace you capture from appears here (key is a hash of the folder path).{" "}
          <strong>Public</strong> shows all prompts in that project on the home feed.
        </p>
        {projects.length === 0 ? (
          <p className="text-base-content/60 text-sm">No projects yet — send a prompt from Cursor with hooks enabled.</p>
        ) : (
          <ul className="space-y-4">
            {projects.map((p) => (
              <li
                key={p.id}
                className="card bg-base-200 border border-base-300 card-body"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {p.display_name || `Project ${p.workspace_key.slice(0, 8)}…`}
                    </p>
                    <p className="text-base-content/50 font-mono text-xs">
                      key {p.workspace_key.slice(0, 12)}… · {p.prompt_count} prompts
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase opacity-60">Visibility</span>
                    <select
                      className="select select-bordered select-sm"
                      value={p.visibility}
                      onChange={(e) =>
                        void setProjectVisibility(
                          p.id,
                          e.target.value as "public" | "private",
                        )
                      }
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>
                <ProjectNameForm
                  key={p.id}
                  initial={p.display_name ?? ""}
                  onSave={(name) => void saveProjectName(p.id, name)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectNameForm({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="form-control flex-1 min-w-[12rem]">
        <span className="label-text text-xs">Display name</span>
        <input
          className="input input-bordered input-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="My app"
        />
      </label>
      <button type="button" className="btn btn-sm btn-outline" onClick={() => onSave(value)}>
        Save name
      </button>
    </div>
  );
}
