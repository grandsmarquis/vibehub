import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const CONFIG_DIR = path.join(os.homedir(), ".vibehub");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readConfig(): {
  apiUrl: string;
  token: string;
  enabled: boolean;
} {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      apiUrl: typeof j.apiUrl === "string" ? j.apiUrl : "http://localhost:3000",
      token: typeof j.token === "string" ? j.token : "",
      enabled: j.enabled !== false,
    };
  } catch {
    return { apiUrl: "http://localhost:3000", token: "", enabled: true };
  }
}

function writeConfig(partial: Partial<ReturnType<typeof readConfig>>) {
  const cur = readConfig();
  const next = { ...cur, ...partial };
  fs.mkdirSync(CONFIG_DIR, { mode: 0o700, recursive: true });
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(
      {
        apiUrl: next.apiUrl.replace(/\/+$/, ""),
        token: next.token,
        enabled: next.enabled,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}

function syncFromWorkspace() {
  const cfg = vscode.workspace.getConfiguration("vibehub");
  const apiUrl = cfg.get<string>("apiUrl") ?? "http://localhost:3000";
  const captureEnabled = cfg.get<boolean>("captureEnabled") !== false;
  const disk = readConfig();
  writeConfig({
    apiUrl,
    enabled: captureEnabled,
    token: disk.token,
  });
}

export function activate(context: vscode.ExtensionContext) {
  syncFromWorkspace();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("vibehub")) {
        syncFromWorkspace();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibehub.setToken", async () => {
      const token = await vscode.window.showInputBox({
        title: "Vibehub extension token",
        prompt: "Paste the token from the Vibehub website (Settings).",
        password: true,
        ignoreFocusOut: true,
      });
      if (!token?.trim()) {
        return;
      }
      const disk = readConfig();
      writeConfig({ ...disk, token: token.trim() });
      vscode.window.showInformationMessage("Vibehub token saved to ~/.vibehub/config.json");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibehub.openSettings", () => {
      const cfg = vscode.workspace.getConfiguration("vibehub");
      const base = (cfg.get<string>("apiUrl") ?? "http://localhost:3000").replace(
        /\/+$/,
        "",
      );
      void vscode.env.openExternal(vscode.Uri.parse(`${base}/settings`));
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibehub.syncConfig", () => {
      syncFromWorkspace();
      vscode.window.showInformationMessage("Vibehub config synced for hooks.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibehub.showHookSnippet", () => {
      const hookPath = path.join(context.extensionPath, "scripts", "hook.mjs");
      const snippet = `{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "node \\"${hookPath}\\" beforeSubmitPrompt"
      }
    ],
    "afterAgentResponse": [
      {
        "command": "node \\"${hookPath}\\" afterAgentResponse"
      }
    ]
  }
}`;
      void vscode.env.clipboard.writeText(snippet);
      vscode.window.showInformationMessage(
        "hooks.json snippet copied. Add to ~/.cursor/hooks.json or project .cursor/hooks.json",
      );
    }),
  );
}

export function deactivate() {}
