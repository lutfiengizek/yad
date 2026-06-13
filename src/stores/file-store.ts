// Dosya store'u: aktif görünüm/sorgu için dosya listesini yükler.
// Sidebar seçimleri (Tüm Dosyalar, Son Eklenen, bir volume) sorguyu belirler.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { FileItem, SearchQuery } from "@/lib/api/types";

interface FileState {
  files: FileItem[];
  total: number;
  loading: boolean;
  query: SearchQuery;
  activeKey: string;
  selectedId: string | null;
  selectView: (key: string, query: SearchQuery) => Promise<void>;
  reload: () => Promise<void>;
  select: (id: string | null) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  total: 0,
  loading: false,
  query: {},
  activeKey: "all",
  selectedId: null,
  selectView: async (key, query) => {
    set({ activeKey: key, query });
    await get().reload();
  },
  reload: async () => {
    set({ loading: true });
    const page = await api.fileList(get().query);
    set({ files: page.items, total: page.total, loading: false });
  },
  select: (id) => set({ selectedId: id }),
}));
