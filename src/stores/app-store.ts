import { create } from "zustand";

// Merkez panelde ne gösterildiği: dosya listesi ya da kişi kartı detayı.
export type Route = { name: "files" } | { name: "person"; personId: string };

interface AppState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  commandOpen: boolean;
  previewOpen: boolean;
  route: Route;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  commandOpen: false,
  previewOpen: false,
  route: { name: "files" },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setRoute: (route) => set({ route }),
}));
