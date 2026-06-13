import { create } from "zustand";

// Merkez panelde ne gösterildiği: dosya listesi ya da kişi kartı detayı.
export type Route = { name: "files" } | { name: "person"; personId: string };

// Dosya görünüm modu: ızgara/liste (kalıcı) + loupe/karşılaştır (geçici).
export type ViewMode = "grid" | "list" | "loupe" | "compare";

interface AppState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  commandOpen: boolean;
  previewOpen: boolean;
  viewMode: ViewMode;
  route: Route;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  commandOpen: false,
  previewOpen: false,
  viewMode: "grid",
  route: { name: "files" },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setRoute: (route) => set({ route }),
}));
