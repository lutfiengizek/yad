import { create } from "zustand";

// Merkez panelde ne gösterildiği: dosya listesi ya da kişi kartı detayı.
export type Route = { name: "files" } | { name: "person"; personId: string };

interface AppState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  route: Route;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  route: { name: "files" },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setRoute: (route) => set({ route }),
}));
