// Ayarlar store'u: backend ayarlarını yükler/günceller (api katmanı üzerinden).
// theme/defaultView/gridDensity gibi tercihler buradan okunur.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Settings } from "@/lib/api/types";

interface SettingsState {
  settings: Settings | null;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loaded: false,
  load: async () => {
    const settings = await api.settingsGet();
    set({ settings, loaded: true });
  },
  update: async (patch) => {
    const settings = await api.settingsSet(patch);
    set({ settings });
  },
}));
