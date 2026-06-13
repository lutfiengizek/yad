// Inspector Geçmiş sekmesi: dosyanın sürüm zaman çizgisi + sürüme geri dönme.

import { useEffect, useState } from "react";
import { RotateCcwIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { FileItem, Version } from "@/lib/api/types";
import { formatBytes, formatRelative } from "@/lib/format";
import { initials } from "@/lib/person";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file-store";

export function VersionHistory({ file }: { file: FileItem }) {
  const [versions, setVersions] = useState<Version[]>([]);

  useEffect(() => {
    let cancelled = false;
    void api.versionList(file.id).then((v) => {
      if (!cancelled) setVersions(v);
    });
    return () => {
      cancelled = true;
    };
    // file.modifiedAt değişince (geri yükleme) yeniden yükle.
  }, [file.id, file.modifiedAt]);

  async function restore(versionId: string) {
    await api.versionRestore({ fileId: file.id, versionId });
    await useFileStore.getState().reload();
    setVersions(await api.versionList(file.id));
  }

  if (versions.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {t("inspector.noVersions")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {versions.map((v) => (
        <div key={v.id} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span
              className={cn(
                "size-2 rounded-full",
                v.isCurrent ? "bg-primary" : "border-muted-foreground/50 border",
              )}
            />
            <span className="bg-border mt-1 w-px flex-1" />
          </div>
          <div className="flex-1 space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{v.label}</span>
              {v.isCurrent && (
                <Badge variant="secondary" className="text-[10px]">
                  {t("inspector.versionCurrent")}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Avatar className="size-4">
                <AvatarFallback className="text-[8px]">
                  {initials(v.authorName)}
                </AvatarFallback>
              </Avatar>
              {v.authorName} · {formatRelative(v.createdAt)} ·{" "}
              {formatBytes(v.sizeBytes)}
            </p>
            {!v.isCurrent && (
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => void restore(v.id)}
              >
                <RotateCcwIcon className="size-3" />
                {t("inspector.versionRestore")}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
