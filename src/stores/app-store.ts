import { create } from "zustand";

// Merkez panelde ne gösterildiği: dosya listesi, kişi kartı, aktivite akışı ya da çöp.
export type Route =
  | { name: "files" }
  | { name: "person"; personId: string }
  | { name: "activity" }
  | { name: "trash" };

// Dosya görünüm modu: ızgara/liste (kalıcı) + loupe/karşılaştır (geçici).
export type ViewMode = "grid" | "list" | "loupe" | "compare";

interface AppState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  commandOpen: boolean;
  previewOpen: boolean;
  membersOpen: boolean;
  joinOpen: boolean;
  conflictOpen: boolean;
  profileOpen: boolean;
  viewMode: ViewMode;
  route: Route;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setMembersOpen: (open: boolean) => void;
  setJoinOpen: (open: boolean) => void;
  setConflictOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  commandOpen: false,
  previewOpen: false,
  membersOpen: false,
  joinOpen: false,
  conflictOpen: false,
  profileOpen: false,
  viewMode: "grid",
  route: { name: "files" },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setMembersOpen: (open) => set({ membersOpen: open }),
  setJoinOpen: (open) => set({ joinOpen: open }),
  setConflictOpen: (open) => set({ conflictOpen: open }),
  setProfileOpen: (open) => set({ profileOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setRoute: (route) => set({ route }),
}));
