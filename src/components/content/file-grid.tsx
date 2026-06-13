// Izgara görünümü (Lightroom deseni): köşe rozetleri (etiket/not), rating, tür ikonu/thumbnail.

import { StarIcon, StickyNoteIcon, TagIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { FileItem, Settings } from "@/lib/api/types";
import { assetUrl } from "@/lib/asset";
import { cn } from "@/lib/utils";
import { FileKindIcon } from "./file-kind";

export const DENSITY_COLS: Record<number, string> = {
  1: "grid-cols-2",
  2: "grid-cols-3",
  3: "grid-cols-4",
  4: "grid-cols-5",
  5: "grid-cols-6",
};

interface FileGridProps {
  files: FileItem[];
  selectedId: string | null;
  density: number;
  badges: Settings["badges"];
  onSelect: (id: string) => void;
}

export function FileGrid({
  files,
  selectedId,
  density,
  badges,
  onSelect,
}: FileGridProps) {
  return (
    <div className={cn("grid gap-3 p-3", DENSITY_COLS[density] ?? DENSITY_COLS[3])}>
      {files.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          aria-pressed={selectedId === f.id}
          className={cn(
            "group flex flex-col gap-1 rounded-md p-1 text-left transition-colors hover:bg-accent/50",
            selectedId === f.id && "bg-accent ring-primary ring-1",
            !f.isAvailable && "opacity-60",
          )}
        >
          <div className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden rounded">
            {f.thumbnailPath ? (
              <img
                src={assetUrl(f.thumbnailPath)}
                alt={f.name}
                className="size-full object-cover"
              />
            ) : (
              <FileKindIcon kind={f.kind} className="text-muted-foreground size-8" />
            )}
            {badges.tag && f.tagIds.length > 0 && (
              <span className="bg-background/80 text-muted-foreground absolute top-1 left-1 rounded p-0.5">
                <TagIcon className="size-3" />
              </span>
            )}
            {badges.note && f.hasNote && (
              <span className="bg-background/80 text-muted-foreground absolute top-1 right-1 rounded p-0.5">
                <StickyNoteIcon className="size-3" />
              </span>
            )}
            {f.rating > 0 && (
              <span className="bg-background/80 text-primary absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 text-[10px]">
                <StarIcon className="size-3 fill-current" />
                {f.rating}
              </span>
            )}
          </div>
          <span className="truncate text-xs">{f.name}</span>
        </button>
      ))}
    </div>
  );
}

export function FileGridSkeleton({ density }: { density: number }) {
  return (
    <div className={cn("grid gap-3 p-3", DENSITY_COLS[density] ?? DENSITY_COLS[3])}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1 p-1">
          <Skeleton className="aspect-square rounded" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
