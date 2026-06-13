// Mock backend: aynı Api imzaları, bellek-içi durum ve sahte ilerleme event'leri.
// Backend hazır olmadan tüm ekranlar (boş/dolu/yükleniyor/hata) geliştirilebilsin diye.
// VITE_MOCK_EMPTY=true ile boş durumdan (onboarding) başlar.

import type { Api } from "./contract";
import { MockEventBus } from "./events";
import {
  NOW,
  defaultSettings,
  sampleFiles,
  sampleIdentity,
  sampleLibrary,
  sampleVolumes,
} from "./mock-fixtures";
import type {
  FileItem,
  FileKind,
  Identity,
  ImportFilesInput,
  Library,
  Settings,
  Volume,
} from "./types";

const MOCK_DELAY = import.meta.env.MODE === "test" ? 0 : 140;
const IMPORT_STEP = import.meta.env.MODE === "test" ? 0 : 280;
const START_EMPTY = import.meta.env.VITE_MOCK_EMPTY === "true";

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function kindFromExt(ext: string): FileKind {
  const e = ext.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(e)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(e)) return "video";
  if (["mp3", "m4a", "wav", "aac", "flac"].includes(e)) return "audio";
  if (["pdf", "doc", "docx", "txt", "md"].includes(e)) return "document";
  return "other";
}

class MockState {
  identity: Identity | null = START_EMPTY ? null : clone(sampleIdentity);
  settings: Settings = clone(defaultSettings);
  libraries: Library[] = START_EMPTY ? [] : [clone(sampleLibrary)];
  volumes: Volume[] = START_EMPTY ? [] : clone(sampleVolumes);
  files: FileItem[] = START_EMPTY ? [] : clone(sampleFiles);
  bus = new MockEventBus();
  counters = { library: 1, volume: 2, batch: 0, file: sampleFiles.length };
}

// Modül ömrü boyunca tek durum (gerçek backend gibi kalıcı davranır).
const state = new MockState();

function findFile(id: string): FileItem {
  const found = state.files.find((f) => f.id === id);
  if (!found) {
    throw { code: "not_found", message: `Dosya bulunamadı: ${id}` };
  }
  return found;
}

// İçe aktarma ilerlemesini kademeli simüle eder; bitince dosyaları ekler.
function simulateImport(batchId: string, paths: string[], volumeId: string): void {
  const total = paths.length;
  let completed = 0;
  const phases = ["copy", "hash", "thumbnail"] as const;

  paths.forEach((path, index) => {
    phases.forEach((phase, p) => {
      const at = (index * phases.length + p + 1) * IMPORT_STEP;
      setTimeout(() => {
        state.bus.emit("import:progress", {
          batchId,
          total,
          completed,
          currentFile: basename(path),
          phase,
        });
      }, at);
    });

    const doneAt = (index * phases.length + phases.length) * IMPORT_STEP;
    setTimeout(() => {
      completed += 1;
      const name = basename(path);
      const ext = name.includes(".") ? name.split(".").pop()! : "";
      state.files.unshift({
        id: `f-new-${++state.counters.file}`,
        volumeId,
        name,
        relPath: name,
        absPath: `/import/${name}`,
        ext,
        mime: "application/octet-stream",
        kind: kindFromExt(ext),
        sizeBytes: 1_000_000,
        contentHash: `blake3-new-${state.counters.file}`,
        rating: 0,
        createdAt: NOW,
        addedAt: NOW,
        modifiedAt: NOW,
        tagIds: [],
        personIds: [],
        collectionIds: [],
        hasNote: false,
        isAvailable: true,
      });
      state.bus.emit("import:progress", {
        batchId,
        total,
        completed,
        currentFile: name,
        phase: completed === total ? "done" : "copy",
      });
    }, doneAt);
  });
}

export const mockApi: Api = {
  // --- M0 ---
  appInit: () =>
    delay({
      hasLibrary: state.libraries.length > 0,
      identitySet: state.identity !== null,
    }),

  settingsGet: () => delay(clone(state.settings)),

  settingsSet: (patch) => {
    state.settings = { ...state.settings, ...patch };
    return delay(clone(state.settings));
  },

  identityGet: () => delay(state.identity ? clone(state.identity) : null),

  identitySet: (input) => {
    state.identity = { id: state.identity?.id ?? "person-self", ...input };
    return delay(clone(state.identity));
  },

  // --- M1 ---
  libraryList: () => delay(clone(state.libraries)),

  libraryCreate: (input) => {
    const id = `lib-${++state.counters.library}`;
    const library: Library = {
      id,
      name: input.name,
      rootPath: input.rootPath,
      isWorkspaceRoot: input.isWorkspaceRoot ?? state.libraries.length === 0,
      createdAt: NOW,
    };
    state.libraries.push(library);
    // Kütüphanenin kök volume'unu da oluştur.
    state.volumes.push({
      id: `vol-${++state.counters.volume}`,
      libraryId: id,
      name: input.name,
      rootPath: input.rootPath,
      status: "connected",
      isWorkspaceRoot: true,
    });
    return delay(clone(library));
  },

  libraryOpen: (id) => {
    const found = state.libraries.find((l) => l.id === id);
    if (!found) throw { code: "not_found", message: `Kütüphane bulunamadı: ${id}` };
    return delay(clone(found));
  },

  volumeList: (libraryId) =>
    delay(clone(state.volumes.filter((v) => v.libraryId === libraryId))),

  volumeRescan: (volumeId) => {
    const found = state.volumes.find((v) => v.id === volumeId);
    if (!found) throw { code: "not_found", message: `Volume bulunamadı: ${volumeId}` };
    return delay(clone(found));
  },

  importFiles: (input: ImportFilesInput) => {
    const batchId = `batch-${++state.counters.batch}`;
    simulateImport(batchId, input.paths, state.volumes[0]?.id ?? "vol-main");
    return delay({ batchId });
  },

  importFromClipboard: () => {
    const batchId = `batch-${++state.counters.batch}`;
    simulateImport(batchId, ["pano-gorsel.png"], state.volumes[0]?.id ?? "vol-main");
    return delay({ batchId });
  },

  fileList: (query) => {
    const includeOffline = query.includeOffline ?? true;
    let items = state.files.filter((f) => {
      if (!includeOffline && !f.isAvailable) return false;
      if (query.volumeId && f.volumeId !== query.volumeId) return false;
      if (query.kinds?.length && !query.kinds.includes(f.kind)) return false;
      if (query.ratingMin != null && f.rating < query.ratingMin) return false;
      if (query.collectionId && !f.collectionIds.includes(query.collectionId))
        return false;
      if (query.tagIds?.length && !query.tagIds.every((t) => f.tagIds.includes(t)))
        return false;
      if (
        query.personIds?.length &&
        !query.personIds.every((p) => f.personIds.includes(p))
      )
        return false;
      if (query.text && !f.name.toLowerCase().includes(query.text.toLowerCase()))
        return false;
      return true;
    });

    const sortBy = query.sortBy ?? "addedAt";
    const dir = query.sortDir === "asc" ? 1 : -1;
    items = items.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });

    const total = items.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 200;
    return delay({ items: clone(items.slice(offset, offset + limit)), total });
  },

  fileGet: (id) => delay(clone(findFile(id))),

  fileRename: ({ id, newName }) => {
    const f = findFile(id);
    f.name = newName;
    f.modifiedAt = NOW;
    return delay(clone(f));
  },

  fileSetSourceUrl: ({ id, url }) => {
    const f = findFile(id);
    f.sourceUrl = url;
    f.modifiedAt = NOW;
    return delay(clone(f));
  },

  fileOpenExternal: () => delay(undefined),
  fileRevealInOs: () => delay(undefined),

  // --- Events ---
  onImportProgress: (cb) => state.bus.on("import:progress", cb),
  onVolumeChanged: (cb) => state.bus.on("volume:changed", cb),
};
