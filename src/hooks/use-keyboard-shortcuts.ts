// Tek-tuş görünüm kısayolları: G ızgara, L liste, E loupe, C karşılaştır.
// (Space → önizleme QuickPreview'da.) Metin girişi/dialog/komut açıkken devre dışı.

import { useEffect } from "react";
import { toast } from "sonner";

import { t } from "@/i18n";
import { isEditableTarget } from "@/lib/dom";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";
import { useFileStore } from "@/stores/file-store";
import { useTrashStore } from "@/stores/trash-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const app = useAppStore.getState();
      if (app.commandOpen || app.previewOpen) return;
      if (isEditableTarget(e.target)) return;

      // ? her route'ta kısayol listesini açar.
      if (e.key === "?") {
        e.preventDefault();
        app.setShortcutsOpen(true);
        return;
      }

      if (app.route.name !== "files") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Delete") {
        if (useCollabStore.getState().myRole === "viewer") return;
        const id = useFileStore.getState().selectedId;
        if (!id) return;
        e.preventDefault();
        void useFileStore
          .getState()
          .moveToTrash([id])
          .then(() => {
            toast.success(t("trash.movedToast"), {
              action: {
                label: t("activity.undo"),
                onClick: () => void useTrashStore.getState().restore([id]),
              },
            });
          });
        return;
      }

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
