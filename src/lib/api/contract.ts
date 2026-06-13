// Api arayüzü: gerçek client (client.ts) ve mock (mock.ts) bu imzaya uyar.
// Ekran kodu yalnızca bu arayüzü görür; mock↔gerçek geçişi index.ts'te yapılır.
// Milestone ilerledikçe genişler (M1: kütüphane/dosya, M2: organizasyon, ...).

import type {
  AppInitResult,
  Identity,
  IdentityInput,
  ImportProgress,
  Settings,
  Volume,
} from "./types";

export type Unsubscribe = () => void;

export interface Api {
  // M0 — temel
  appInit(): Promise<AppInitResult>;
  settingsGet(): Promise<Settings>;
  settingsSet(patch: Partial<Settings>): Promise<Settings>;
  identityGet(): Promise<Identity | null>;
  identitySet(input: IdentityInput): Promise<Identity>;

  // Events (backend emit → frontend listen) — payload tipleri sözleşmeden.
  onImportProgress(cb: (p: ImportProgress) => void): Unsubscribe;
  onVolumeChanged(cb: (v: Volume) => void): Unsubscribe;
}
