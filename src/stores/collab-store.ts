// İşbirliği store'u: üyeler, senkron durumu, çatışmalar + yerel kullanıcının rolü.

import { create } from "zustand";

import { api } from "@/lib/api";
import type {
  Conflict,
  MemberInfo,
  ResolveChoice,
  Role,
  SyncStatus,
} from "@/lib/api/types";

interface CollabState {
  members: MemberInfo[];
  conflicts: Conflict[];
  sync: SyncStatus | null;
  myRole: Role | null;
  loaded: boolean;
  load: () => Promise<void>;
  setRole: (personId: string, role: Role) => Promise<void>;
  remove: (personId: string) => Promise<void>;
  resolveConflict: (input: {
    conflictId: string;
    choice: ResolveChoice;
    mergedValue?: string;
  }) => Promise<void>;
  setSync: (sync: SyncStatus) => void;
  addConflict: (conflict: Conflict) => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  members: [],
  conflicts: [],
  sync: null,
  myRole: null,
  loaded: false,
  load: async () => {
    const [members, conflicts, sync, identity] = await Promise.all([
      api.memberList(),
      api.conflictList(),
      api.syncStatus(),
      api.identityGet(),
    ]);
    const myRole = identity
      ? (members.find((m) => m.person.id === identity.id)?.role ?? null)
      : null;
    set({ members, conflicts, sync, myRole, loaded: true });
  },
  setRole: async (personId, role) => {
    await api.memberSetRole({ personId, role });
    await get().load();
  },
  remove: async (personId) => {
    await api.memberRemove(personId);
    await get().load();
  },
  resolveConflict: async (input) => {
    await api.conflictResolve(input);
    set({ conflicts: await api.conflictList() });
  },
  setSync: (sync) => set({ sync }),
  addConflict: (conflict) =>
    set({ conflicts: [conflict, ...get().conflicts] }),
}));
