# Vibehub (Cursor / VS Code extension)

Captures Cursor Agent prompts via **hooks** and sends them to your Vibehub web app.

## Setup

1. Run the Vibehub web app and sign in with GitHub.
2. In **Settings**, create an **extension token** and copy it.
3. Install this extension (from VSIX or run in Extension Development Host).
4. Run command **Vibehub: Set extension token** and paste the token.
5. Set **Vibehub: Api Url** if not using `http://localhost:3000`.
6. Run **Vibehub: Show hooks.json snippet** — paste into `~/.cursor/hooks.json` (global) or `.cursor/hooks.json` (project). Adjust paths if you move `scripts/hook.mjs`.

Hooks call Node on `beforeSubmitPrompt` and `afterAgentResponse`. The script responds immediately and uploads in the background using `~/.vibehub/config.json` (synced from workspace settings + token).

## Privacy

Prompts may contain secrets. New workspaces default to **private** projects on the server; make a project **public** in Vibehub **Settings** only when you intend to share.
