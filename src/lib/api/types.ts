// YAD API sözleşme tipleri — TEK KAYNAK.
// docs/build/01-api-contract.md ile birebir eşleşir. Değişiklik önce sözleşmede yapılır.

export type Id = string;
export type IsoDate = string;

export type FileKind = "image" | "video" | "audio" | "document" | "other";
export type TagType = "person" | "time" | "event" | "place" | "free";
export type Role = "owner" | "editor" | "viewer";
export type VolumeStatus = "connected" | "offline";

export interface Library {
  id: Id;
  name: string;
  rootPath: string;
  isWorkspaceRoot: boolean;
  createdAt: IsoDate;
}

export interface Volume {
  id: Id;
  libraryId: Id;
  name: string;
  rootPath: string;
  status: VolumeStatus;
  isWorkspaceRoot: boolean;
  diskLabel?: string;
}

export interface FileItem {
  id: Id; // stabil kimlik (uuid)
  volumeId: Id;
  name: string; // görünen ad
  relPath: string; // kütüphane köküne göre yol
  absPath: string; // asset protokolü için mutlak yol
  ext: string;
  mime: string;
  kind: FileKind;
  sizeBytes: number;
  contentHash: string; // BLAKE3
  thumbnailPath?: string;
  sourceUrl?: string;
  rating: number; // 0–5 (0 = derecelendirilmemiş)
  createdAt: IsoDate; // dosya oluşturulma
  addedAt: IsoDate; // kütüphaneye eklenme
  modifiedAt: IsoDate; // son metadata değişimi
  tagIds: Id[];
  personIds: Id[];
  collectionIds: Id[];
  hasNote: boolean;
  isAvailable: boolean; // false → çevrimdışı volume'da
}

export interface Tag {
  id: Id;
  name: string;
  type: TagType;
  parentId?: Id; // hiyerarşik
  color?: string; // token adı (ör. 'chart-1'), hex DEĞİL
  count: number; // bağlı dosya sayısı
}

export interface Collection {
  id: Id;
  name: string;
  parentId?: Id;
  icon?: string; // lucide ikon adı
  count: number;
}

export interface Person {
  id: Id;
  fullName: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  avatarPath?: string;
  bio?: string; // ProseMirror JSON (string)
  fileCount: number;
}

export interface NoteDoc {
  fileId: Id;
  contentJson: string; // ProseMirror doküman JSON'u
  updatedAt: IsoDate;
  updatedBy: Id; // actor (kişi) id
}

export interface Version {
  id: Id;
  fileId: Id;
  contentHash: string;
  sizeBytes: number;
  label: string; // insan-okur açıklama
  authorId: Id;
  authorName: string;
  createdAt: IsoDate;
  isCurrent: boolean;
}

export interface ActivityItem {
  id: Id;
  actorId: Id;
  actorName: string;
  action: string; // i18n anahtarı: 'tag.add' | 'file.add' | ...
  objectType: "file" | "collection" | "tag" | "person";
  objectId: Id;
  objectName: string;
  params?: Record<string, string>; // i18n cümlesi için ek
  createdAt: IsoDate;
  undoable: boolean;
}

export interface SearchQuery {
  text?: string;
  kinds?: FileKind[];
  tagIds?: Id[];
  personIds?: Id[];
  collectionId?: Id;
  ratingMin?: number;
  volumeId?: Id;
  includeOffline?: boolean; // varsayılan true (çevrimdışı görünür)
  sortBy?: "addedAt" | "name" | "rating" | "modifiedAt" | "createdAt";
  sortDir?: "asc" | "desc";
  offset?: number; // sayfalama
  limit?: number; // varsayılan 200
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Identity {
  id: Id; // yerel kullanıcı (kişi) id
  displayName: string;
  organization?: string;
  avatarPath?: string;
  nodeId?: string; // Iroh NodeId (ileri; M5)
}

export interface Settings {
  theme: "light" | "dark" | "system";
  locale: "tr" | "en";
  defaultView: "grid" | "list";
  gridDensity: number; // 1–5
  badges: { tag: boolean; note: boolean; sync: boolean; person: boolean };
  trashRetentionDays: number; // varsayılan 30
  importCopyDefault: boolean; // harici dosyayı kopyala
  autoUpdate: boolean;
}

// İlerleme event payload'ı (uzun işlemler)
export interface ImportProgress {
  batchId: Id;
  total: number;
  completed: number;
  currentFile: string;
  phase: "copy" | "hash" | "thumbnail" | "done" | "error";
  errorMessage?: string;
}

// Hata: invoke reject olunca normalize edilen şekil.
export interface ApiError {
  code:
    | "not_found"
    | "permission_denied"
    | "io_error"
    | "volume_offline"
    | "conflict"
    | "invalid_input"
    | "unknown";
  message: string;
  details?: string;
}

// --- Komut giriş/çıkış yardımcı tipleri ---

export interface AppInitResult {
  hasLibrary: boolean;
  identitySet: boolean;
}

export interface IdentityInput {
  displayName: string;
  organization?: string;
  avatarPath?: string;
}

export interface LibraryCreateInput {
  name: string;
  rootPath: string;
  isWorkspaceRoot?: boolean;
}

export interface ImportFilesInput {
  libraryId: Id;
  paths: string[];
  mode: "copy" | "reference";
}

export interface PersonInput {
  fullName: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  avatarPath?: string;
  bio?: string;
}

export interface BatchHandle {
  batchId: Id;
}
