// Tam ekran hızlı önizleme (Space): seçili dosyayı büyük gösterir, ‹/› ile gezilir, Esc/Space kapatır.

import { useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileKindIcon, kindLabel } from "@/components/content/file-kind";
import { t } from "@/i18n";
import { assetUrl } from "@/lib/asset";
import { isEditableTarget } from "@/lib/dom";
import { formatBytes } from "@/lib/format";
import { useAppStore } from "@/stores/app-store";
import { useFileStore } from "@/stores/file-store";

export function QuickPreview() {
  const open = useAppStore((s) => s.previewOpen);
  const setOpen = useAppStore((s) => s.setPreviewOpen);
  const files = useFileStore((s) => s.files);
  const selectedId = useFileStore((s) => s.selectedId);
  const select = useFileStore((s) => s.select);

  const index = files.findIndex((f) => f.id === selectedId);
  const file = index >= 0 ? files[index] : undefined;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const app = useAppStore.getState();
      if (e.key === " " && !isEditableTarget(e.target) && !app.commandOpen) {
        if (!app.previewOpen && !selectedId) return;
        e.preventDefault();
        app.setPreviewOpen(!app.previewOpen);
        return;
      }
      if (!app.previewOpen) return;
      if (e.key === "ArrowLeft" && index > 0) {
        select(files[index - 1].id);
      } else if (e.key === "ArrowRight" && index < files.length - 1) {
        select(files[index + 1].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files, index, selectedId, select]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[88vh] w-[92vw] gap-0 p-0 sm:max-w-none">
        <DialogHeader className="flex-row items-center gap-2 border-b px-4 py-2.5">
          <DialogTitle className="truncate text-sm font-medium">
            {file.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {kindLabel(file.kind)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
          {file.thumbnailPath ? (
            <img
              src={assetUrl(file.thumbnailPath)}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <FileKindIcon
              kind={file.kind}
              className="text-muted-foreground size-24"
            />
          )}

          {index > 0 && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={t("preview.prev")}
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full"
              onClick={() => select(files[index - 1].id)}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
          )}
          {index < files.length - 1 && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={t("preview.next")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
              onClick={() => select(files[index + 1].id)}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-3 border-t px-4 py-2 text-xs">
          <span>{kindLabel(file.kind)}</span>
          <span className="tabular-nums">{formatBytes(file.sizeBytes)}</span>
          {file.rating > 0 && (
            <span className="text-primary flex items-center gap-0.5">
              <StarIcon className="size-3.5 fill-current" />
              {file.rating}
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {index + 1} / {files.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
