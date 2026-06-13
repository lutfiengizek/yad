// Aktivite store'u: aktivite akışı; activity:new ile canlı eklenir; file.trash geri alınır.

import { create } from "zustand";

import { api } from "@/lib/api";
import type { ActivityItem } from "@/lib/api/types";
import { useFileStore } from "./file-store";
import { useTrashStore } from "./trash-store";

interface ActivityState {
  activities: ActivityItem[];
  loaded: boolean;
  load: () => Promise<void>;
  prepend: (a: ActivityItem) => void;
  undo: (id: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loaded: false,
  load: async () => {
    set({ activities: await api.activityList(), loaded: true });
  },
  prepend: (a) => set({ activities: [a, ...get().activities] }),
  undo: async (id) => {
    await api.activityUndo(id);
    await Promise.all([
      get().load(),
      useFileStore.getState().reload(),
      useTrashStore.getState().load(),
    ]);
  },
}));
