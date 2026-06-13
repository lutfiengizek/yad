// Kütüphane store'u: kütüphaneleri yükler, aktif kütüphaneyi tutar.
// Aktif kütüphane değişince volume'lar yeniden yüklenir.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Library, LibraryCreateInput } from "@/lib/api/types";
import { useVolumeStore } from "./volume-store";

interface LibraryState {
  libraries: Library[];
  activeLibraryId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  setActive: (id: string) => Promise<void>;
  create: (input: LibraryCreateInput) => Promise<Library>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  libraries: [],
  activeLibraryId: null,
  loaded: false,
  load: async () => {
    const libraries = await api.libraryList();
    set({ libraries, loaded: true });
    const active = libraries.find((l) => l.isWorkspaceRoot) ?? libraries[0];
    if (active) await get().setActive(active.id);
  },
  setActive: async (id) => {
    set({ activeLibraryId: id });
    await useVolumeStore.getState().load(id);
  },
  create: async (input) => {
    const library = await api.libraryCreate(input);
    set({ libraries: [...get().libraries, library] });
    await get().setActive(library.id);
    return library;
  },
}));
