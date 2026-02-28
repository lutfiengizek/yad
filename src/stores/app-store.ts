import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  activePanel: "files" | "search" | "tags" | "persons";
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setActivePanel: (panel: AppState["activePanel"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  activePanel: "files",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
