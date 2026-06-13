// Kişi store'u: kişileri yükler, oluşturur/günceller, dosyalara bağlar/çözer.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { Person, PersonInput } from "@/lib/api/types";
import { useFileStore } from "./file-store";

interface PersonState {
  persons: Person[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (input: PersonInput) => Promise<Person>;
  update: (id: string, patch: Partial<PersonInput>) => Promise<Person>;
  link: (fileIds: string[], personId: string) => Promise<void>;
  unlink: (fileIds: string[], personId: string) => Promise<void>;
}

export const usePersonStore = create<PersonState>((set, get) => ({
  persons: [],
  loaded: false,
  load: async () => {
    set({ persons: await api.personList(), loaded: true });
  },
  create: async (input) => {
    const person = await api.personCreate(input);
    await get().load();
    return person;
  },
  update: async (id, patch) => {
    const person = await api.personUpdate({ id, ...patch });
    await get().load();
    return person;
  },
  link: async (fileIds, personId) => {
    await api.personLink({ fileIds, personId });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
  unlink: async (fileIds, personId) => {
    await api.personUnlink({ fileIds, personId });
    await Promise.all([get().load(), useFileStore.getState().reload()]);
  },
}));
