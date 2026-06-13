// Etiket store'u: etiketleri yükler, oluşturur, dosyalara atar/kaldırır.
// Atama sonrası file-store ve sayımlar yenilenir.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Tag, TagType } from "@/lib/api/types";
import { useFileStore } from "./file-store";

interface TagState {
  tags: Tag[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (input: {
    name: string;
    type: TagType;
    parentId?: string;
    color?: string;
  }) => Promise<Tag>;
  assign: (fileIds: string[], tagId: string) => Promise<void>;
  unassign: (fileIds: string[], tagId: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loaded: false,
  load: async () => {
    set({ tags: await api.tagList(), loaded: true });
  },
  create: async (input) => {
    const tag = await api.tagCreate(input);
    await get().load();
    return tag;
  },
  assign: async (fileIds, tagId) => {
    await api.tagAssign({ fileIds, tagId });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
  unassign: async (fileIds, tagId) => {
    await api.tagUnassign({ fileIds, tagId });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
}));
