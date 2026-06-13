// Tek-tuş görünüm kısayolları: G ızgara, L liste, E loupe, C karşılaştır.
// (Space → önizleme QuickPreview'da.) Metin girişi/dialog/komut açıkken devre dışı.

import { useEffect } from "react";

import { isEditableTarget } from "@/lib/dom";
import { useAppStore } from "@/stores/app-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const app = useAppStore.getState();
      if (app.commandOpen || app.previewOpen) return;
      if (app.route.name !== "files") return;
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "g":
          app.setViewMode("grid");
          break;
        case "l":
          app.setViewMode("list");
          break;
        case "e":
          app.setViewMode("loupe");
          break;
        case "c":
          app.setViewMode("compare");
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
