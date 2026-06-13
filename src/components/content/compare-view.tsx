// Karşılaştır görünümü (C): seçili öğeden başlayarak en çok 4 dosyayı yan yana gösterir.

import { StarIcon } from "lucide-react";

import { FileKindIcon } from "@/components/content/file-kind";
import { assetUrl } from "@/lib/asset";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/lib/api/types";

interface CompareViewProps {
  files: FileItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CompareView({ files, selectedId, onSelect }: CompareViewProps) {
  const start = Math.max(
    0,
    files.findIndex((f) => f.id === selectedId),
  );
  const window = files.slice(start, start + 4);

  return (
    <div className="flex h-full">
      {window.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          className={cn(
            "flex min-w-0 flex-1 flex-col border-r last:border-r-0",
            f.id === selectedId && "bg-accent/40",
          )}
        >
          <div className="bg-muted flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {f.thumbnailPath ? (
              <img
                src={assetUrl(f.thumbnailPath)}
                alt={f.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <FileKindIcon
                kind={f.kind}
                className="text-muted-foreground size-16"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t px-2 py-1.5">
            <span className="truncate text-xs">{f.name}</span>
            {f.rating > 0 && (
              <span className="text-primary ml-auto flex shrink-0 items-center gap-0.5 text-xs">
                <StarIcon className="size-3 fill-current" />
                {f.rating}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
