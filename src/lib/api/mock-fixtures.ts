// Mock için deterministik örnek veri. Tarih sabittir (testler stabil olsun).
// Milestone ilerledikçe genişler (M1: volume/dosya fixture'ları).

import type {
  FileItem,
  Identity,
  Library,
  Settings,
  Volume,
} from "./types";

export const NOW = "2026-06-13T12:00:00.000Z";

export const defaultSettings: Settings = {
  theme: "system",
  locale: "tr",
  defaultView: "grid",
  gridDensity: 3,
  badges: { tag: true, note: true, sync: true, person: true },
  trashRetentionDays: 30,
  importCopyDefault: true,
  autoUpdate: true,
};

export const sampleIdentity: Identity = {
  id: "person-self",
  displayName: "Ali Yılmaz",
  organization: "Gazete X",
  nodeId: "k51qzi5uqu5d...node",
};

export const sampleLibrary: Library = {
  id: "lib-1",
  name: "Gazete X Arşivi",
  rootPath: "/Users/ali/YAD/GazeteX",
  isWorkspaceRoot: true,
  createdAt: NOW,
};

export const sampleVolumes: Volume[] = [
  {
    id: "vol-main",
    libraryId: "lib-1",
    name: "Yerel Arşiv",
    rootPath: "/Users/ali/YAD/GazeteX",
    status: "connected",
    isWorkspaceRoot: true,
  },
  {
    id: "vol-usb",
    libraryId: "lib-1",
    name: "Saha USB",
    rootPath: "/Volumes/SAHA",
    status: "offline",
    isWorkspaceRoot: false,
    diskLabel: "SAHA",
  },
];

function file(partial: Partial<FileItem> & Pick<FileItem, "id" | "name" | "kind" | "ext" | "mime">): FileItem {
  return {
    volumeId: "vol-main",
    relPath: partial.name,
    absPath: `/Users/ali/YAD/GazeteX/${partial.name}`,
    sizeBytes: 1_200_000,
    contentHash: `blake3-${partial.id}`,
    rating: 0,
    createdAt: NOW,
    addedAt: NOW,
    modifiedAt: NOW,
    tagIds: [],
    personIds: [],
    collectionIds: [],
    hasNote: false,
    isAvailable: true,
    ...partial,
  };
}

export const sampleFiles: FileItem[] = [
  file({ id: "f-1", name: "deprem-saha-01.jpg", kind: "image", ext: "jpg", mime: "image/jpeg", rating: 5, hasNote: true }),
  file({ id: "f-2", name: "deprem-saha-02.jpg", kind: "image", ext: "jpg", mime: "image/jpeg", rating: 4 }),
  file({ id: "f-3", name: "roportaj-meclis.mp4", kind: "video", ext: "mp4", mime: "video/mp4", sizeBytes: 84_000_000, rating: 3 }),
  file({ id: "f-4", name: "ses-kaydi-tanik.m4a", kind: "audio", ext: "m4a", mime: "audio/mp4", sizeBytes: 5_400_000 }),
  file({ id: "f-5", name: "rapor-2026.pdf", kind: "document", ext: "pdf", mime: "application/pdf", sizeBytes: 320_000, hasNote: true }),
  file({ id: "f-6", name: "bilgi-notu.txt", kind: "document", ext: "txt", mime: "text/plain", sizeBytes: 4_200 }),
  file({ id: "f-7", name: "arsiv.zip", kind: "other", ext: "zip", mime: "application/zip", sizeBytes: 12_000_000 }),
  file({
    id: "f-8",
    name: "saha-foto-eski.jpg",
    kind: "image",
    ext: "jpg",
    mime: "image/jpeg",
    volumeId: "vol-usb",
    absPath: "/Volumes/SAHA/saha-foto-eski.jpg",
    isAvailable: false,
    rating: 2,
  }),
];
