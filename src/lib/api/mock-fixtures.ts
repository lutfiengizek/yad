// Mock için deterministik örnek veri. Tarih sabittir (testler stabil olsun).
// Milestone ilerledikçe genişler (M1: volume/dosya fixture'ları).

import type {
  ActivityItem,
  Collection,
  Conflict,
  FileItem,
  Identity,
  Library,
  MemberInfo,
  NoteDoc,
  Person,
  Settings,
  SyncStatus,
  Tag,
  Version,
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
  file({ id: "f-1", name: "deprem-saha-01.jpg", kind: "image", ext: "jpg", mime: "image/jpeg", rating: 5, hasNote: true, tagIds: ["tag-deprem", "tag-ankara", "tag-acil"], personIds: ["person-ahmet"], collectionIds: ["col-deprem"] }),
  file({ id: "f-2", name: "deprem-saha-02.jpg", kind: "image", ext: "jpg", mime: "image/jpeg", rating: 4, tagIds: ["tag-deprem", "tag-ankara"], collectionIds: ["col-deprem"] }),
  file({ id: "f-3", name: "roportaj-meclis.mp4", kind: "video", ext: "mp4", mime: "video/mp4", sizeBytes: 84_000_000, rating: 3, tagIds: ["tag-tbmm"], personIds: ["person-ahmet", "person-ayse"] }),
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

// count alanları mock'ta dosyalardan hesaplanır; burada 0 bırakılır.
export const sampleTags: Tag[] = [
  { id: "tag-ankara", name: "Ankara", type: "place", count: 0 },
  { id: "tag-tbmm", name: "TBMM", type: "place", parentId: "tag-ankara", count: 0 },
  { id: "tag-2026", name: "2026", type: "time", count: 0 },
  { id: "tag-deprem", name: "Deprem", type: "event", count: 0 },
  { id: "tag-acil", name: "Acil", type: "free", color: "chart-1", count: 0 },
];

export const sampleCollections: Collection[] = [
  { id: "col-deprem", name: "Deprem Dosyası", icon: "folder", count: 0 },
  { id: "col-manset", name: "Manşetler", icon: "newspaper", count: 0 },
];

export const samplePersons: Person[] = [
  {
    id: "person-ahmet",
    fullName: "Ahmet Yılmaz",
    title: "Genel Yayın Yönetmeni",
    organization: "Gazete X",
    email: "ahmet@gazetex.example",
    fileCount: 0,
  },
  {
    id: "person-ayse",
    fullName: "Ayşe Demir",
    title: "Saha Muhabiri",
    organization: "Gazete X",
    fileCount: 0,
  },
];

export const sampleVersions: Version[] = [
  {
    id: "ver-1c",
    fileId: "f-1",
    contentHash: "blake3-f-1",
    sizeBytes: 1_200_000,
    label: "Acil etiketi eklendi",
    authorId: "person-self",
    authorName: "Ali Yılmaz",
    createdAt: "2026-06-13T10:00:00.000Z",
    isCurrent: true,
  },
  {
    id: "ver-1b",
    fileId: "f-1",
    contentHash: "blake3-f-1-v2",
    sizeBytes: 1_180_000,
    label: "Renk düzeltmesi",
    authorId: "person-ayse",
    authorName: "Ayşe Demir",
    createdAt: "2026-06-12T15:00:00.000Z",
    isCurrent: false,
  },
  {
    id: "ver-1a",
    fileId: "f-1",
    contentHash: "blake3-f-1-v1",
    sizeBytes: 980_000,
    label: "İlk içe aktarma",
    authorId: "person-self",
    authorName: "Ali Yılmaz",
    createdAt: "2026-06-10T09:00:00.000Z",
    isCurrent: false,
  },
];

export const sampleActivities: ActivityItem[] = [
  {
    id: "act-1",
    actorId: "person-self",
    actorName: "Ali Yılmaz",
    action: "tag.add",
    objectType: "file",
    objectId: "f-1",
    objectName: "deprem-saha-01.jpg",
    params: { tag: "Acil" },
    createdAt: "2026-06-13T10:00:00.000Z",
    undoable: false,
  },
  {
    id: "act-2",
    actorId: "person-ayse",
    actorName: "Ayşe Demir",
    action: "file.add",
    objectType: "file",
    objectId: "f-3",
    objectName: "roportaj-meclis.mp4",
    createdAt: "2026-06-13T09:30:00.000Z",
    undoable: false,
  },
  {
    id: "act-3",
    actorId: "person-self",
    actorName: "Ali Yılmaz",
    action: "collection.create",
    objectType: "collection",
    objectId: "col-deprem",
    objectName: "Deprem Dosyası",
    createdAt: "2026-06-12T16:00:00.000Z",
    undoable: false,
  },
];

export const sampleMembers: MemberInfo[] = [
  {
    person: {
      id: "person-self",
      fullName: "Ali Yılmaz",
      organization: "Gazete X",
      fileCount: 0,
    },
    role: "owner",
    online: true,
  },
  { person: samplePersons[1], role: "editor", online: true },
  { person: samplePersons[0], role: "viewer", online: false },
];

export const sampleConflicts: Conflict[] = [
  {
    id: "conf-1",
    fileId: "f-2",
    field: "rating",
    mine: "4",
    theirs: "3",
    mineAuthor: "Ali Yılmaz",
    theirsAuthor: "Ayşe Demir",
    createdAt: NOW,
  },
];

export const defaultSyncStatus: SyncStatus = {
  state: "idle",
  peersOnline: 1,
  lastSyncedAt: NOW,
};

export const sampleNotes: NoteDoc[] = [
  {
    fileId: "f-1",
    contentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Saha ekibinden gelen ilk kare. Doğrulandı." },
          ],
        },
      ],
    }),
    updatedAt: NOW,
    updatedBy: "person-self",
  },
];
