// Koleksiyon store'u: koleksiyonları yükler, oluşturur, dosya ekler/çıkarır.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Collection } from "@/lib/api/types";
import { useFileStore } from "./file-store";

interface CollectionState {
  collections: Collection[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (input: { name: string; icon?: string }) => Promise<Collection>;
  addFiles: (collectionId: string, fileIds: string[]) => Promise<void>;
  removeFiles: (collectionId: string, fileIds: string[]) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loaded: false,
  load: async () => {
    set({ collections: await api.collectionList(), loaded: true });
  },
  create: async (input) => {
    const collection = await api.collectionCreate(input);
    await get().load();
    return collection;
  },
  addFiles: async (collectionId, fileIds) => {
    await api.collectionAddFiles({ collectionId, fileIds });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
  removeFiles: async (collectionId, fileIds) => {
    await api.collectionRemoveFiles({ collectionId, fileIds });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
}));
