// Düzenleme izni: Viewer rolü salt-okunur. Yerel (rol yok) ya da owner/editor düzenleyebilir.

import { useCollabStore } from "@/stores/collab-store";

export function useCanEdit(): boolean {
  return useCollabStore((s) => s.myRole !== "viewer");
}
