// Çöp kutusu sayfası: çöpteki dosyalar (çoklu seçim), seçilenleri geri al / kalıcı sil.

import { useEffect, useState } from "react";
import { ArrowLeftIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { FileKindIcon } from "@/components/content/file-kind";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTrashStore } from "@/stores/trash-store";

export function TrashPage() {
  const files = useTrashStore((s) => s.files);
  const load = useTrashStore((s) => s.load);
  const restore = useTrashStore((s) => s.restore);
  const deletePermanent = useTrashStore((s) => s.deletePermanent);
  const setRoute = useAppStore((s) => s.setRoute);
  const retentionDays = useSettingsStore(
    (s) => s.settings?.trashRetentionDays ?? 30,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = [...selected];

  async function doRestore() {
    await restore(ids);
    setSelected(new Set());
  }

  async function doDelete() {
    await deletePermanent(ids);
    setSelected(new Set());
    setConfirmOpen(false);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("onboarding.back")}
          onClick={() => setRoute({ name: "files" })}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">{t("trash.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {files.length}
        </span>
        <span className="text-muted-foreground text-xs">
          · {t("trash.retention").replace("{days}", String(retentionDays))}
        </span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={ids.length === 0}
          onClick={() => void doRestore()}
        >
          <RotateCcwIcon className="size-4" />
          {t("trash.restore")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          disabled={ids.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon className="size-4" />
          {t("trash.deletePermanent")}
        </Button>
      </header>

      <ScrollArea className="h-full flex-1">
        {files.length === 0 ? (
          <EmptyState icon={Trash2Icon} message={t("trash.empty")} />
        ) : (
          <div className="grid grid-cols-4 gap-3 p-3">
            {files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                aria-pressed={selected.has(f.id)}
                className={cn(
                  "group relative flex flex-col gap-1 rounded-md p-1 text-left transition-colors hover:bg-accent/50",
                  selected.has(f.id) && "bg-accent ring-primary ring-1",
                )}
              >
                <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden rounded">
                  <FileKindIcon
                    kind={f.kind}
                    className="text-muted-foreground size-8"
                  />
                </div>
                <Checkbox
                  checked={selected.has(f.id)}
                  className="absolute top-2 left-2 bg-background"
                  tabIndex={-1}
                />
                <span className="truncate text-xs">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("trash.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("trash.confirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t("common.cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => void doDelete()}>
              {t("trash.deletePermanent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
