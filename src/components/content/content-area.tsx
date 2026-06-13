// İçerik alanı: başlık + öğe sayısı, görünüm (ızgara/liste) ve yoğunluk anahtarı,
// dolu/boş/yükleniyor durumları. Görünüm tercihi ayarlardan okunur/yazılır.

import {
  ArchiveIcon,
  LayoutGridIcon,
  ListIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "@/i18n";
import { useFileStore } from "@/stores/file-store";
import { useSettingsStore } from "@/stores/settings-store";
import { FileGrid, FileGridSkeleton } from "./file-grid";
import { FileList } from "./file-list";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
      <ArchiveIcon className="text-muted-foreground size-10" />
      <p className="text-muted-foreground max-w-xs text-sm">{t("grid.empty")}</p>
      <Button variant="outline" size="sm">
        <PlusIcon className="size-4" />
        {t("grid.addFiles")}
      </Button>
    </div>
  );
}

export function ContentArea() {
  const files = useFileStore((s) => s.files);
  const total = useFileStore((s) => s.total);
  const loading = useFileStore((s) => s.loading);
  const selectedId = useFileStore((s) => s.selectedId);
  const select = useFileStore((s) => s.select);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  const view = settings?.defaultView ?? "grid";
  const density = settings?.gridDensity ?? 3;
  const badges = settings?.badges ?? {
    tag: true,
    note: true,
    sync: true,
    person: true,
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="text-sm font-semibold">{t("grid.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {total} {t("grid.itemCount")}
        </span>
        <div className="flex-1" />

        {view === "grid" && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("grid.densityDecrease")}
              disabled={density <= 1}
              onClick={() => updateSettings({ gridDensity: density - 1 })}
            >
              <MinusIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("grid.densityIncrease")}
              disabled={density >= 5}
              onClick={() => updateSettings({ gridDensity: density + 1 })}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={t("grid.viewGrid")}
            aria-pressed={view === "grid"}
            onClick={() => updateSettings({ defaultView: "grid" })}
          >
            <LayoutGridIcon className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={t("grid.viewList")}
            aria-pressed={view === "list"}
            onClick={() => updateSettings({ defaultView: "list" })}
          >
            <ListIcon className="size-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {loading ? (
          <FileGridSkeleton density={density} />
        ) : files.length === 0 ? (
          <EmptyState />
        ) : view === "grid" ? (
          <FileGrid
            files={files}
            selectedId={selectedId}
            density={density}
            badges={badges}
            onSelect={select}
          />
        ) : (
          <FileList files={files} selectedId={selectedId} onSelect={select} />
        )}
      </ScrollArea>
    </div>
  );
}
