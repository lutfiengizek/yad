// Liste görünümü: Ad | Tür | ⭐ | Tarih | Boyut. Yoğun tarama için.

import { StarIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from "@/i18n";
import type { FileItem } from "@/lib/api/types";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileKindIcon, kindLabel } from "./file-kind";

interface FileListProps {
  files: FileItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FileList({ files, selectedId, onSelect }: FileListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("grid.colName")}</TableHead>
          <TableHead>{t("grid.colKind")}</TableHead>
          <TableHead>{t("grid.colRating")}</TableHead>
          <TableHead>{t("grid.colDate")}</TableHead>
          <TableHead className="text-right">{t("grid.colSize")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((f) => (
          <TableRow
            key={f.id}
            data-state={selectedId === f.id ? "selected" : undefined}
            onClick={() => onSelect(f.id)}
            className={cn("cursor-pointer", !f.isAvailable && "opacity-60")}
          >
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                <FileKindIcon
                  kind={f.kind}
                  className="text-muted-foreground size-4 shrink-0"
                />
                <span className="truncate">{f.name}</span>
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {kindLabel(f.kind)}
            </TableCell>
            <TableCell>
              {f.rating > 0 ? (
                <span className="text-primary flex items-center gap-0.5">
                  <StarIcon className="size-3.5 fill-current" />
                  {f.rating}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {formatDate(f.addedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground text-right tabular-nums">
              {formatBytes(f.sizeBytes)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
