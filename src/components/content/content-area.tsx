// İçerik alanı: başlık + öğe sayısı, görünüm (ızgara/liste/loupe/karşılaştır) ve yoğunluk,
// filtre/sıralama, dolu/boş/yükleniyor durumları.

import {
  ArchiveIcon,
  Columns2Icon,
  LayoutGridIcon,
  ListIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { t } from "@/i18n";
import { startClipboardImport } from "@/lib/import";
import { useAppStore, type ViewMode } from "@/stores/app-store";
import { useFileStore } from "@/stores/file-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CompareView } from "./compare-view";
import { FileGrid, FileGridSkeleton } from "./file-grid";
import { FileList } from "./file-list";
import { FilterControls } from "./filter-controls";
import { LoupeView } from "./loupe-view";

const VIEW_BUTTONS: { mode: ViewMode; label: string; Icon: typeof ListIcon }[] = [
  { mode: "grid", label: "viewGrid", Icon: LayoutGridIcon },
  { mode: "list", label: "viewList", Icon: ListIcon },
  { mode: "loupe", label: "viewLoupe", Icon: Maximize2Icon },
  { mode: "compare", label: "viewCompare", Icon: Columns2Icon },
];

export function ContentArea() {
  const files = useFileStore((s) => s.files);
  const total = useFileStore((s) => s.total);
  const loading = useFileStore((s) => s.loading);
  const selectedId = useFileStore((s) => s.selectedId);
  const select = useFileStore((s) => s.select);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setPreviewOpen = useAppStore((s) => s.setPreviewOpen);

  function open(id: string) {
    select(id);
    setPreviewOpen(true);
  }

  // Izgara/liste kalıcı (defaultView); loupe/karşılaştır geçici.
  function setView(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "grid" || mode === "list") {
      void updateSettings({ defaultView: mode });
    }
  }

  const density = settings?.gridDensity ?? 3;
  const badges = settings?.badges ?? {
    tag: true,
    note: true,
    sync: true,
    person: true,
  };

  function body() {
    if (loading) {
      return (
        <ScrollArea className="h-full">
          <FileGridSkeleton density={density} />
        </ScrollArea>
      );
    }
    if (files.length === 0) {
      return (
        <ScrollArea className="h-full">
          <EmptyState
            icon={ArchiveIcon}
            message={t("grid.empty")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void startClipboardImport()}
              >
                <PlusIcon className="size-4" />
                {t("grid.addFiles")}
              </Button>
            }
          />
        </ScrollArea>
      );
    }
    if (viewMode === "loupe") {
      return <LoupeView files={files} selectedId={selectedId} onSelect={select} />;
    }
    if (viewMode === "compare") {
      return (
        <CompareView files={files} selectedId={selectedId} onSelect={select} />
      );
    }
    return (
      <ScrollArea className="h-full">
        {viewMode === "list" ? (
          <FileList
            files={files}
            selectedId={selectedId}
            onSelect={select}
            onOpen={open}
          />
        ) : (
          <FileGrid
            files={files}
            selectedId={selectedId}
            density={density}
            badges={badges}
            onSelect={select}
            onOpen={open}
          />
        )}
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="text-sm font-semibold">{t("grid.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {total} {t("grid.itemCount")}
        </span>
        <div className="flex-1" />

        <FilterControls />

        {viewMode === "grid" && (
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
          {VIEW_BUTTONS.map(({ mode, label, Icon }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t(`grid.${label}` as "grid.viewGrid")}
              aria-pressed={viewMode === mode}
              onClick={() => setView(mode)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1">{body()}</div>
    </div>
  );
}
