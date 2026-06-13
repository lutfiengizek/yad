// Sağ müfettiş paneli: seçili dosyanın önizleme + düzenlenebilir rating + sekmeler.
// Künye sekmesi metadata; etiket/kişi/not bölümleri sonraki M2 adımlarında eklenir.

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  MousePointerClickIcon,
  PencilIcon,
  StarIcon,
  XIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanEdit } from "@/hooks/use-can-edit";
import { FileKindIcon, kindLabel } from "@/components/content/file-kind";
import { CollectionSection } from "./collection-section";
import { PersonSection } from "./person-section";
import { TagSection } from "./tag-section";
import { VersionHistory } from "./version-history";
import { t } from "@/i18n";

// tiptap ağır olduğu için not editörü ilk dosya seçildiğinde yüklenir (ayrı chunk).
const NoteSection = lazy(() =>
  import("./note-section").then((m) => ({ default: m.NoteSection })),
);
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/asset";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file-store";

function EditableRating({
  value,
  onRate,
  disabled,
}: {
  value: number;
  onRate: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}`}
          disabled={disabled}
          onClick={() => onRate(n === value ? 0 : n)}
          className="text-muted-foreground/40 enabled:hover:text-primary transition-colors disabled:cursor-default"
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
  const canEdit = useCanEdit();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  useEffect(() => {
    setRenaming(false);
    setEditingUrl(false);
  }, [file?.id]);

  if (!file) {
    return (
      <EmptyState
        icon={MousePointerClickIcon}
        message={t("inspector.empty")}
      />
    );
  }

  async function rate(n: number) {
    await api.fileSetRating({ id: file!.id, rating: n });
    await useFileStore.getState().reload();
  }

  async function doRename() {
    const name = nameDraft.trim();
    if (name && name !== file!.name) {
      await api.fileRename({ id: file!.id, newName: name });
      await useFileStore.getState().reload();
    }
    setRenaming(false);
  }

  async function doSetUrl() {
    await api.fileSetSourceUrl({ id: file!.id, url: urlDraft.trim() });
    await useFileStore.getState().reload();
    setEditingUrl(false);
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
          {renaming ? (
            <div className="flex items-center gap-1">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void doRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("inspector.save")}
                onClick={() => void doRename()}
              >
                <CheckIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.cancel")}
                onClick={() => setRenaming(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-sm font-medium break-all">
                {file.name}
              </h2>
              {!canEdit ? (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {t("collab.readOnly")}
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("inspector.rename")}
                  className="shrink-0"
                  onClick={() => {
                    setNameDraft(file.name);
                    setRenaming(true);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            {kindLabel(file.kind)} · {formatBytes(file.sizeBytes)}
            {!file.isAvailable && ` · ${t("inspector.offline")}`}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">
            {t("inspector.rating")}
          </span>
          <EditableRating
            value={file.rating}
            onRate={rate}
            disabled={!canEdit}
          />
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
            <PersonSection file={file} />
            <CollectionSection file={file} />
            <Suspense fallback={null}>
              <NoteSection file={file} />
            </Suspense>

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
              <MetaRow
                label={t("inspector.url")}
                value={
                  editingUrl ? (
                    <span className="flex items-center gap-1">
                      <Input
                        value={urlDraft}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        autoFocus
                        placeholder="https://…"
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void doSetUrl();
                          if (e.key === "Escape") setEditingUrl(false);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("inspector.save")}
                        onClick={() => void doSetUrl()}
                      >
                        <CheckIcon className="size-4" />
                      </Button>
                    </span>
                  ) : file.sourceUrl ? (
                    <span className="flex items-center gap-1">
                      <a
                        href={file.sourceUrl}
                        className="text-primary inline-flex items-center gap-1 truncate hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.sourceUrl}
                        <ExternalLinkIcon className="size-3 shrink-0" />
                      </a>
                      {canEdit && (
                        <button
                          type="button"
                          aria-label={t("inspector.rename")}
                          onClick={() => {
                            setUrlDraft(file.sourceUrl ?? "");
                            setEditingUrl(true);
                          }}
                        >
                          <PencilIcon className="text-muted-foreground size-3" />
                        </button>
                      )}
                    </span>
                  ) : canEdit ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setUrlDraft("");
                        setEditingUrl(true);
                      }}
                    >
                      {t("inspector.addSourceUrl")}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
              />
            </dl>

            <Separator />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!file.isAvailable}
                onClick={() => void api.fileOpenExternal(file.id)}
              >
                <ExternalLinkIcon className="size-4" />
                {t("inspector.openExternal")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={t("inspector.reveal")}
                disabled={!file.isAvailable}
                onClick={() => void api.fileRevealInOs(file.id)}
              >
                <FolderOpenIcon className="size-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-2">
            <VersionHistory file={file} />
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
