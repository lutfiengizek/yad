// Çatışma çözüm modalı: yan yana mine/theirs + Bunu tut / İkisini birleştir.
// CRDT çoğu şeyi otomatik birleştirir; bu modal yalnızca gerçek çatışmada açılır.

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import type { ResolveChoice } from "@/lib/api/types";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";

export function ConflictModal() {
  const open = useAppStore((s) => s.conflictOpen);
  const setOpen = useAppStore((s) => s.setConflictOpen);
  const conflicts = useCollabStore((s) => s.conflicts);
  const resolve = useCollabStore((s) => s.resolveConflict);
  const current = conflicts[0];

  useEffect(() => {
    if (open && conflicts.length === 0) setOpen(false);
  }, [open, conflicts.length, setOpen]);

  if (!current) return null;

  async function choose(choice: ResolveChoice) {
    let mergedValue: string | undefined;
    if (choice === "merge") {
      const a = Number(current.mine);
      const b = Number(current.theirs);
      mergedValue =
        Number.isNaN(a) || Number.isNaN(b)
          ? `${current.mine} ${current.theirs}`
          : String(Math.max(a, b));
    }
    await resolve({ conflictId: current.id, choice, mergedValue });
    if (useCollabStore.getState().conflicts.length === 0) {
      toast.success(t("collab.conflictResolved"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("collab.conflictTitle")}</DialogTitle>
          <DialogDescription>
            {current.field} · {conflicts.length} {t("collab.conflictBadge")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 rounded-md border p-3">
            <span className="text-muted-foreground text-xs font-medium">
              {t("collab.conflictMine")}
            </span>
            <p className="text-sm break-words">{current.mine}</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => void choose("mine")}
            >
              {t("collab.conflictKeep")}
            </Button>
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <span className="text-muted-foreground text-xs font-medium">
              {current.theirsAuthor} {t("collab.conflictTheirs")}
            </span>
            <p className="text-sm break-words">{current.theirs}</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => void choose("theirs")}
            >
              {t("collab.conflictKeep")}
            </Button>
          </div>
        </div>

        <Button variant="outline" onClick={() => void choose("merge")}>
          {t("collab.conflictMerge")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
