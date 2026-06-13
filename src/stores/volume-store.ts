// Volume store'u: aktif kütüphanenin volume'larını yükler (durum rozetleri için).

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Volume } from "@/lib/api/types";

interface VolumeState {
  volumes: Volume[];
  loaded: boolean;
  load: (libraryId: string) => Promise<void>;
  rescan: (volumeId: string) => Promise<void>;
}

export const useVolumeStore = create<VolumeState>((set, get) => ({
  volumes: [],
  loaded: false,
  load: async (libraryId) => {
    const volumes = await api.volumeList(libraryId);
    set({ volumes, loaded: true });
  },
  rescan: async (volumeId) => {
    const updated = await api.volumeRescan(volumeId);
    set({
      volumes: get().volumes.map((v) => (v.id === updated.id ? updated : v)),
    });
  },
}));
