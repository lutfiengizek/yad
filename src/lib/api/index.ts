// Tek giriş noktası: ekran kodu `import { api } from "@/lib/api"` kullanır.
// Mock mı gerçek mi olduğunu burada seçeriz; tipler aynı olduğu için ekran kodu değişmez.

import { clientApi } from "./client";
import type { Api } from "./contract";
import { mockApi } from "./mock";

export function shouldUseMock(): boolean {
  const flag = import.meta.env.VITE_USE_MOCK;
  if (flag === "false") return false;
  if (flag === "true") return true;
  // Varsayılan: Tauri içinde değilsek (tarayıcı/test) mock kullan.
  return typeof window === "undefined" || !("__TAURI_INTERNALS__" in window);
}

export const api: Api = shouldUseMock() ? mockApi : clientApi;

export type { Api, Unsubscribe } from "./contract";
export * from "./types";
