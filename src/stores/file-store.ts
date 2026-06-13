// Dosya store'u: aktif görünüm (sidebar seçimi) + kullanıcı filtreleri birleştirilerek listelenir.
// baseQuery = görünüm kapsamı (etiket/koleksiyon/volume/kişi). filters = tür/rating/sıralama/çevrimdışı.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { FileItem, SearchQuery } from "@/lib/api/types";

interface FileState {
  files: FileItem[];
  total: number;
  loading: boolean;
  baseQuery: SearchQuery;
  filters: SearchQuery;
  activeKey: string;
  selectedId: string | null;
  selectView: (key: string, query: SearchQuery) => Promise<void>;
  setFilters: (patch: SearchQuery) => Promise<void>;
  reload: () => Promise<void>;
  select: (id: string | null) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  total: 0,
  loading: false,
  baseQuery: {},
  filters: {},
  activeKey: "all",
  selectedId: null,
  selectView: async (key, query) => {
    set({ activeKey: key, baseQuery: query });
    await get().reload();
  },
  setFilters: async (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    await get().reload();
  },
  reload: async () => {
    set({ loading: true });
    const { baseQuery, filters } = get();
    const page = await api.fileList({ ...baseQuery, ...filters });
    set({ files: page.items, total: page.total, loading: false });
  },
  select: (id) => set({ selectedId: id }),
}));
