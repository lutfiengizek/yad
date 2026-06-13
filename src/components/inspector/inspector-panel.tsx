// Sağ müfettiş paneli: seçili dosyanın önizleme + künyesi.
// Etiket/kişi/not/rating düzenleme M2'de eklenir.

import type { ReactNode } from "react";
import { ExternalLinkIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileKindIcon, kindLabel } from "@/components/content/file-kind";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/asset";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file-store";

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={cn(
            "size-4",
            n <= value ? "fill-primary text-primary" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}

export function InspectorPanel() {
  const file = useFileStore((s) =>
    s.files.find((f) => f.id === s.selectedId),
  );

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">{t("inspector.empty")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-md">
          {file.thumbnailPath ? (
            <img
              src={assetUrl(file.thumbnailPath)}
              alt={file.name}
              className="size-full object-cover"
            />
          ) : (
            <FileKindIcon
              kind={file.kind}
              className="text-muted-foreground size-10"
            />
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-medium break-all">{file.name}</h2>
          <p className="text-muted-foreground text-xs">
            {kindLabel(file.kind)} · {formatBytes(file.sizeBytes)}
            {!file.isAvailable && ` · ${t("inspector.offline")}`}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">
            {t("inspector.rating")}
          </span>
          <Rating value={file.rating} />
        </div>

        <Separator />

        <dl className="space-y-2 text-sm">
          <MetaRow label={t("inspector.added")} value={formatDate(file.addedAt)} />
          <MetaRow
            label={t("inspector.created")}
            value={formatDate(file.createdAt)}
          />
          <MetaRow label={t("inspector.mime")} value={file.mime} />
          <MetaRow
            label={t("inspector.hash")}
            value={
              <span className="font-mono text-xs">{file.contentHash}</span>
            }
          />
          {file.sourceUrl && (
            <MetaRow
              label={t("inspector.url")}
              value={
                <a
                  href={file.sourceUrl}
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.sourceUrl}
                  <ExternalLinkIcon className="size-3" />
                </a>
              }
            />
          )}
        </dl>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!file.isAvailable}
          onClick={() => void api.fileOpenExternal(file.id)}
        >
          <ExternalLinkIcon className="size-4" />
          {t("inspector.openExternal")}
        </Button>
      </div>
    </ScrollArea>
  );
}
