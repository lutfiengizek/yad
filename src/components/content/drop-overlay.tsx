// Pencere geneli sürükle-bırak katmanı. Dosya sürüklenince görünür; bırakınca içe aktarır.
// Not: tarayıcı/mock'ta HTML5 drag-drop; gerçek Tauri'de OS yolları drag-drop event'inden gelir.

import { useEffect, useState } from "react";
import { DownloadIcon } from "lucide-react";

import { t } from "@/i18n";
import { startImport } from "@/lib/import";

export function DropOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");

    function onEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setActive(true);
    }
    function onOver(e: DragEvent) {
      if (hasFiles(e)) e.preventDefault();
    }
    function onLeave() {
      depth -= 1;
      if (depth <= 0) {
        depth = 0;
        setActive(false);
      }
    }
    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setActive(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) void startImport(files.map((f) => f.name));
    }

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="border-primary text-primary flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-12 py-10 text-lg font-medium">
        <DownloadIcon className="size-8" />
        {t("importQueue.dropHere")}
      </div>
    </div>
  );
}
