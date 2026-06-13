// Gerçek backend client: her komutu Tauri `invoke` ile çağırır, hatayı ApiError'a normalize eder.
// Backend bir komutu bitirene kadar index.ts mock'a düşer; tipler aynı olduğu için ekran kodu değişmez.

import { invoke } from "@tauri-apps/api/core";
import type { Api } from "./contract";
import { tauriListen } from "./events";
import type { ApiError } from "./types";

function normalizeError(err: unknown): ApiError {
  // Tauri komutu AppError'u { code, message, details? } olarak serileştirir.
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    return err as ApiError;
  }
  return {
    code: "unknown",
    message: err instanceof Error ? err.message : String(err),
  };
}

async function call<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw normalizeError(err);
  }
}

export const clientApi: Api = {
  appInit: () => call("app_init"),
  settingsGet: () => call("settings_get"),
  settingsSet: (patch) => call("settings_set", { patch }),
  identityGet: () => call("identity_get"),
  identitySet: (input) => call("identity_set", { input }),

  onImportProgress: (cb) => tauriListen("import:progress", cb),
  onVolumeChanged: (cb) => tauriListen("volume:changed", cb),
};
