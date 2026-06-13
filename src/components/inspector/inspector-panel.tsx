// Sağ müfettiş paneli: seçili dosyanın önizleme + düzenlenebilir rating + sekmeler.
// Künye sekmesi metadata; etiket/kişi/not bölümleri sonraki M2 adımlarında eklenir.

import type { ReactNode } from "react";
import { ExternalLinkIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileKindIcon, kindLabel } from "@/components/content/file-kind";
import { CollectionSection } from "./collection-section";
import { TagSection } from "./tag-section";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/asset";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file-store";

function EditableRating({
  value,
  onRate,
}: {
  value: number;
  onRate: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}`}
          onClick={() => onRate(n === value ? 0 : n)}
          className="text-muted-foreground/40 hover:text-primary transition-colors"
        >
          <StarIcon
            className={cn("size-5", n <= value && "fill-primary text-primary")}
          />
        </button>
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
  const file = useFileStore((s) => s.files.find((f) => f.id === s.selectedId));

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">{t("inspector.empty")}</p>
      </div>
    );
  }

  async function rate(n: number) {
    await api.fileSetRating({ id: file!.id, rating: n });
    await useFileStore.getState().reload();
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
          <EditableRating value={file.rating} onRate={rate} />
        </div>

        <Tabs defaultValue="detail">
          <TabsList className="w-full">
            <TabsTrigger value="detail">{t("inspector.tabDetail")}</TabsTrigger>
            <TabsTrigger value="history">
              {t("inspector.tabHistory")}
            </TabsTrigger>
            <TabsTrigger value="attribution">
              {t("inspector.tabAttribution")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="space-y-4 pt-2">
            <TagSection file={file} />
            <CollectionSection file={file} />

            <Separator />

            <dl className="space-y-2 text-sm">
              <MetaRow
                label={t("inspector.added")}
                value={formatDate(file.addedAt)}
              />
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
          </TabsContent>

          <TabsContent value="history" className="pt-2">
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("inspector.historyPlaceholder")}
            </p>
          </TabsContent>

          <TabsContent value="attribution" className="pt-2">
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("inspector.attributionPlaceholder")}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
