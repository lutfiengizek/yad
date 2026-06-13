// İçerik başlığı filtre + sıralama kontrolleri. file-store filtrelerine işler.

import { ArrowDownUpIcon, FilterIcon, StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { t } from "@/i18n";
import type { FileKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file-store";

const KINDS: FileKind[] = ["image", "video", "audio", "document", "other"];
const KIND_LABEL: Record<FileKind, string> = {
  image: "kindImage",
  video: "kindVideo",
  audio: "kindAudio",
  document: "kindDocument",
  other: "kindOther",
};
const SORT_FIELDS = [
  "addedAt",
  "name",
  "rating",
  "modifiedAt",
  "createdAt",
] as const;
const SORT_LABEL: Record<(typeof SORT_FIELDS)[number], string> = {
  addedAt: "sortAddedAt",
  name: "sortName",
  rating: "sortRating",
  modifiedAt: "sortModifiedAt",
  createdAt: "sortCreatedAt",
};

export function FilterControls() {
  const filters = useFileStore((s) => s.filters);
  const setFilters = useFileStore((s) => s.setFilters);

  const activeCount =
    (filters.kinds?.length ? 1 : 0) +
    (filters.ratingMin ? 1 : 0) +
    (filters.includeOffline === false ? 1 : 0);

  function toggleKind(kind: FileKind) {
    const current = filters.kinds ?? [];
    const next = current.includes(kind)
      ? current.filter((k) => k !== kind)
      : [...current, kind];
    void setFilters({ kinds: next.length ? next : undefined });
  }

  const sortBy = filters.sortBy ?? "addedAt";
  const sortDir = filters.sortDir ?? "desc";

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <FilterIcon className="size-4" />
            {t("grid.filter")}
            {activeCount > 0 && (
              <Badge className="size-4 justify-center rounded-full p-0 tabular-nums">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-medium">{t("grid.kindLabel")}</span>
            <div className="grid gap-1.5">
              {KINDS.map((kind) => {
                const checked = filters.kinds?.includes(kind) ?? false;
                return (
                  <label
                    key={kind}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleKind(kind)}
                    />
                    {t(`grid.${KIND_LABEL[kind]}` as "grid.kindImage")}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium">{t("grid.ratingMin")}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n}`}
                  onClick={() =>
                    void setFilters({
                      ratingMin: filters.ratingMin === n ? undefined : n,
                    })
                  }
                  className="text-muted-foreground/40 hover:text-primary"
                >
                  <StarIcon
                    className={cn(
                      "size-5",
                      (filters.ratingMin ?? 0) >= n &&
                        "fill-primary text-primary",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters.includeOffline !== false}
              onCheckedChange={(c) =>
                void setFilters({ includeOffline: c ? undefined : false })
              }
            />
            {t("grid.includeOffline")}
          </label>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() =>
                void setFilters({
                  kinds: undefined,
                  ratingMin: undefined,
                  includeOffline: undefined,
                })
              }
            >
              {t("grid.clearFilters")}
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowDownUpIcon className="size-4" />
            {t("grid.sort")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(v) =>
              void setFilters({ sortBy: v as typeof sortBy })
            }
          >
            {SORT_FIELDS.map((field) => (
              <DropdownMenuRadioItem key={field} value={field}>
                {t(`grid.${SORT_LABEL[field]}` as "grid.sortAddedAt")}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortDir}
            onValueChange={(v) =>
              void setFilters({ sortDir: v as "asc" | "desc" })
            }
          >
            <DropdownMenuRadioItem value="desc">
              {t("grid.sortDesc")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">
              {t("grid.sortAsc")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
