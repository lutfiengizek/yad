// İçe aktarma kuyruğu (sağ alt): import:progress event'ini dinler, ilerleme/aşama gösterir,
// bitince toast atar ve dosya listesini yeniler.

import { useEffect, useState } from "react";
import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { ImportProgress } from "@/lib/api/types";
import { useFileStore } from "@/stores/file-store";

function phaseLabel(phase: ImportProgress["phase"]): string {
  switch (phase) {
    case "copy":
      return t("importQueue.phaseCopy");
    case "hash":
      return t("importQueue.phaseHash");
    case "thumbnail":
      return t("importQueue.phaseThumbnail");
    case "done":
      return t("importQueue.phaseDone");
    default:
      return "";
  }
}

export function ImportQueue() {
  const [batches, setBatches] = useState<Record<string, ImportProgress>>({});
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const unsub = api.onImportProgress((p) => {
      setHidden(false);
      setBatches((prev) => ({ ...prev, [p.batchId]: p }));
      if (p.phase === "done") {
        toast.success(`${p.total} ${t("importQueue.completed")}`);
        void useFileStore.getState().reload();
        setTimeout(() => {
          setBatches((prev) => {
            const next = { ...prev };
            delete next[p.batchId];
            return next;
          });
        }, 2500);
      }
    });
    return unsub;
  }, []);

  const items = Object.values(batches);
  if (hidden || items.length === 0) return null;

  return (
    <div className="bg-popover text-popover-foreground fixed right-4 bottom-10 z-40 w-72 rounded-lg border p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{t("importQueue.importing")}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("importQueue.hide")}
          onClick={() => setHidden(true)}
        >
          <XIcon />
        </Button>
      </div>
      <div className="grid gap-3">
        {items.map((p) => (
          <div key={p.batchId} className="grid gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate">{p.currentFile}</span>
              <span className="text-muted-foreground tabular-nums">
                {p.completed}/{p.total}
              </span>
            </div>
            <Progress value={Math.round((p.completed / p.total) * 100)} />
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              {p.phase !== "done" && (
                <Loader2Icon className="size-3 animate-spin" />
              )}
              {phaseLabel(p.phase)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
