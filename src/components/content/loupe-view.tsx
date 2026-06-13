// Loupe görünümü (E): tek öğe büyük + alt film şeridi. ‹/› ve ok tuşlarıyla gezilir.

import { useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FileKindIcon } from "@/components/content/file-kind";
import { t } from "@/i18n";
import { assetUrl } from "@/lib/asset";
import { isEditableTarget } from "@/lib/dom";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/lib/api/types";

interface LoupeViewProps {
  files: FileItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LoupeView({ files, selectedId, onSelect }: LoupeViewProps) {
  const index = Math.max(
    0,
    files.findIndex((f) => f.id === selectedId),
  );
  const file = files[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowLeft" && index > 0) onSelect(files[index - 1].id);
      else if (e.key === "ArrowRight" && index < files.length - 1)
        onSelect(files[index + 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files, index, onSelect]);

  if (!file) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        {file.thumbnailPath ? (
          <img
            src={assetUrl(file.thumbnailPath)}
            alt={file.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <FileKindIcon kind={file.kind} className="text-muted-foreground size-24" />
        )}

        {index > 0 && (
          <Button
            variant="secondary"
            size="icon"
            aria-label={t("preview.prev")}
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full"
            onClick={() => onSelect(files[index - 1].id)}
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
            onClick={() => onSelect(files[index + 1].id)}
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        )}
      </div>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-t p-2">
        {files.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={cn(
              "bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded",
              f.id === file.id && "ring-primary ring-2",
            )}
          >
            {f.thumbnailPath ? (
              <img
                src={assetUrl(f.thumbnailPath)}
                alt={f.name}
                className="size-full object-cover"
              />
            ) : (
              <FileKindIcon kind={f.kind} className="text-muted-foreground size-5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
