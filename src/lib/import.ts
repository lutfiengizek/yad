// İçe aktarma tetikleyicileri: aktif kütüphaneye dosya/pano içeri aktarır.
// İlerleme `import:progress` event'iyle akar (ImportQueue dinler).

import { api } from "@/lib/api";
import { useLibraryStore } from "@/stores/library-store";

export async function startImport(paths: string[]): Promise<void> {
  const libraryId = useLibraryStore.getState().activeLibraryId;
  if (!libraryId || paths.length === 0) return;
  await api.importFiles({ libraryId, paths, mode: "copy" });
}

export async function startClipboardImport(): Promise<void> {
  const libraryId = useLibraryStore.getState().activeLibraryId;
  if (!libraryId) return;
  await api.importFromClipboard({ libraryId });
}
