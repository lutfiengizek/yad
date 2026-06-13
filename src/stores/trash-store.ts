// Çöp store'u: çöpteki dosyalar; geri al / kalıcı sil.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { FileItem } from "@/lib/api/types";
import { useFileStore } from "./file-store";

interface TrashState {
  files: FileItem[];
  loaded: boolean;
  load: () => Promise<void>;
  restore: (ids: string[]) => Promise<void>;
  deletePermanent: (ids: string[]) => Promise<void>;
}

export const useTrashStore = create<TrashState>((set, get) => ({
  files: [],
  loaded: false,
  load: async () => {
    set({ files: await api.trashList(), loaded: true });
  },
  restore: async (ids) => {
    await api.fileRestore({ ids });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
  deletePermanent: async (ids) => {
    await api.fileDeletePermanent({ ids });
    await get().load();
  },
}));
