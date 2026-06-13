// Dosya türü → Lucide ikon + Türkçe etiket. Thumbnail yoksa (görsel dışı) ikon gösterilir.

import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Music2Icon,
  VideoIcon,
} from "lucide-react";

import { t } from "@/i18n";
import type { FileKind } from "@/lib/api/types";

const ICON = {
  image: ImageIcon,
  video: VideoIcon,
  audio: Music2Icon,
  document: FileTextIcon,
  other: FileIcon,
} as const;

export function FileKindIcon({
  kind,
  className,
}: {
  kind: FileKind;
  className?: string;
}) {
  const Icon = ICON[kind];
  return <Icon className={className} />;
}

export function kindLabel(kind: FileKind): string {
  switch (kind) {
    case "image":
      return t("grid.kindImage");
    case "video":
      return t("grid.kindVideo");
    case "audio":
      return t("grid.kindAudio");
    case "document":
      return t("grid.kindDocument");
    default:
      return t("grid.kindOther");
  }
}
