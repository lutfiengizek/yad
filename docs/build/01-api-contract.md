# YAD — API Sözleşmesi (Frontend ↔ Backend)

**Versiyon:** 1.0 (M0–M3 detaylı; M4–M6 sırası gelince) · **Tarih:** 13 Haziran 2026

> **Bu doküman iki agent için TEK HAKİKAT KAYNAĞIDIR.** Frontend bu tiplere/komutlara göre `invoke` çağırır; Backend bu imzaları aynen uygular. Değişiklik → bu dosya güncellenir → kullanıcı onayı → iki agent sync.

## Konvansiyonlar

- **Komut adları:** `snake_case` (Tauri). Örn. `file_list`.
- **Alan adları:** Sınırda **camelCase** (TS doğal). Rust struct'ları `#[serde(rename_all = "camelCase")]` kullanır.
- **ID'ler:** `string`. Dosya içerik hash'i BLAKE3 (hex). Diğer ID'ler uuid.
- **Tarih:** ISO 8601 string (UTC).
- **Hata:** Komutlar `Result<T, AppError>` döner; FE'de `invoke` reject olur. `AppError` serileşmiş şekli: `{ code: string, message: string, details?: string }`. `code` örnekleri: `not_found`, `permission_denied`, `io_error`, `volume_offline`, `conflict`, `invalid_input`, `unknown`.
- **Uzun işlemler:** İlerleme Tauri **event**'leriyle bildirilir (aşağıda §Events).
- **Thumbnail/dosya görseli:** FE, yerel dosyayı Tauri **asset protokolü** (`convertFileSrc`) ile gösterir; backend `thumbnailPath`/`absPath` döner. Byte'lar komuttan akmaz.

---

## 1. Paylaşılan Tipler (TypeScript imzası — Rust struct karşılığı birebir)

```ts
export type Id = string;
export type IsoDate = string;

export type FileKind = 'image' | 'video' | 'audio' | 'document' | 'other';
export type TagType  = 'person' | 'time' | 'event' | 'place' | 'free';
export type Role     = 'owner' | 'editor' | 'viewer';
export type VolumeStatus = 'connected' | 'offline';

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
  id: Id;                  // stabil kimlik (uuid)
  volumeId: Id;
  name: string;            // görünen ad
  relPath: string;         // kütüphane köküne göre yol
  absPath: string;         // asset protokolü için mutlak yol
  ext: string;
  mime: string;
  kind: FileKind;
  sizeBytes: number;
  contentHash: string;     // BLAKE3
  thumbnailPath?: string;
  sourceUrl?: string;
  rating: number;          // 0–5 (0 = derecelendirilmemiş)
  createdAt: IsoDate;      // dosya oluşturulma
  addedAt: IsoDate;        // kütüphaneye eklenme
  modifiedAt: IsoDate;     // son metadata değişimi
  tagIds: Id[];
  personIds: Id[];
  collectionIds: Id[];
  hasNote: boolean;
  isAvailable: boolean;    // false → çevrimdışı volume'da
}

export interface Tag {
  id: Id;
  name: string;
  type: TagType;
  parentId?: Id;           // hiyerarşik
  color?: string;          // token adı (ör. 'chart-1'), hex DEĞİL
  count: number;           // bağlı dosya sayısı
}

export interface Collection {
  id: Id;
  name: string;
  parentId?: Id;
  icon?: string;           // lucide ikon adı
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
  bio?: string;            // ProseMirror JSON (string)
  fileCount: number;
}

export interface NoteDoc {
  fileId: Id;
  contentJson: string;     // ProseMirror doküman JSON'u
  updatedAt: IsoDate;
  updatedBy: Id;           // actor (kişi) id
}

export interface Version {
  id: Id;
  fileId: Id;
  contentHash: string;
  sizeBytes: number;
  label: string;           // insan-okur açıklama
  authorId: Id;
  authorName: string;
  createdAt: IsoDate;
  isCurrent: boolean;
}

export interface ActivityItem {
  id: Id;
  actorId: Id;
  actorName: string;
  action: string;          // i18n anahtarı: 'tag.add' | 'file.add' | 'file.rename' | 'collection.create' | 'file.trash' | ...
  objectType: 'file' | 'collection' | 'tag' | 'person';
  objectId: Id;
  objectName: string;
  params?: Record<string, string>;  // i18n cümlesi için ek (ör. { tag: 'Acil' })
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
  includeOffline?: boolean;          // varsayılan true (çevrimdışı görünür)
  sortBy?: 'addedAt' | 'name' | 'rating' | 'modifiedAt' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  offset?: number;                   // sayfalama
  limit?: number;                    // varsayılan 200
}

export interface Page<T> { items: T[]; total: number; }

export interface Identity {
  id: Id;                  // yerel kullanıcı (kişi) id
  displayName: string;
  organization?: string;
  avatarPath?: string;
  nodeId?: string;         // Iroh NodeId (ileri; M5)
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  locale: 'tr' | 'en';
  defaultView: 'grid' | 'list';
  gridDensity: number;            // 1–5
  badges: { tag: boolean; note: boolean; sync: boolean; person: boolean };
  trashRetentionDays: number;     // varsayılan 30
  importCopyDefault: boolean;     // harici dosyayı kopyala
  autoUpdate: boolean;
  // Senkron/ağ (M5): relay adresi, sadece-yerel modu vb. sonra eklenir
}

// İlerleme event payload'ı (uzun işlemler)
export interface ImportProgress {
  batchId: Id;
  total: number;
  completed: number;
  currentFile: string;
  phase: 'copy' | 'hash' | 'thumbnail' | 'done' | 'error';
  errorMessage?: string;
}
```

---

## 2. Komutlar (milestone bazında)

> İmza biçimi: `command_name(params) -> ReturnType`. Tümü `Result<…, AppError>`.

### M0 — temel
- `app_init() -> { hasLibrary: boolean; identitySet: boolean }`  (açılışta yönlendirme için)
- `settings_get() -> Settings`
- `settings_set(patch: Partial<Settings>) -> Settings`
- `identity_get() -> Identity | null`
- `identity_set(input: { displayName: string; organization?: string; avatarPath?: string }) -> Identity`

### M1 — kütüphane, volume, içe aktarma, dosya listeleme
- `library_list() -> Library[]`
- `library_create(input: { name: string; rootPath: string; isWorkspaceRoot?: boolean }) -> Library`
- `library_open(id: Id) -> Library`
- `volume_list(libraryId: Id) -> Volume[]`
- `volume_rescan(volumeId: Id) -> Volume`
- `import_files(input: { libraryId: Id; paths: string[]; mode: 'copy' | 'reference' }) -> { batchId: Id }`  *(ilerleme `import:progress` event'iyle)*
- `import_from_clipboard(input: { libraryId: Id }) -> { batchId: Id }`
- `file_list(query: SearchQuery) -> Page<FileItem>`
- `file_get(id: Id) -> FileItem`
- `file_rename(input: { id: Id; newName: string }) -> FileItem`
- `file_set_source_url(input: { id: Id; url: string }) -> FileItem`
- `file_open_external(id: Id) -> void`
- `file_reveal_in_os(id: Id) -> void`

### M2 — organizasyon
- `tag_list() -> Tag[]`
- `tag_create(input: { name: string; type: TagType; parentId?: Id; color?: string }) -> Tag`
- `tag_rename(input: { id: Id; name: string }) -> Tag`
- `tag_delete(id: Id) -> void`
- `tag_assign(input: { fileIds: Id[]; tagId: Id; applyToChildren?: boolean }) -> void`
- `tag_unassign(input: { fileIds: Id[]; tagId: Id }) -> void`
- `tag_suggest(fileId: Id) -> Tag[]`   // 9 bağlam-duyarlı öneri
- `collection_list() -> Collection[]`
- `collection_create(input: { name: string; parentId?: Id; icon?: string }) -> Collection`
- `collection_rename(input: { id: Id; name: string }) -> Collection`
- `collection_delete(id: Id) -> void`
- `collection_add_files(input: { collectionId: Id; fileIds: Id[] }) -> void`
- `collection_remove_files(input: { collectionId: Id; fileIds: Id[] }) -> void`
- `person_list() -> Person[]`
- `person_get(id: Id) -> Person`
- `person_create(input: PersonInput) -> Person`
- `person_update(input: { id: Id } & Partial<PersonInput>) -> Person`
- `person_delete(id: Id) -> void`
- `person_link(input: { fileIds: Id[]; personId: Id }) -> void`
- `person_unlink(input: { fileIds: Id[]; personId: Id }) -> void`
- `note_get(fileId: Id) -> NoteDoc | null`
- `note_set(input: { fileId: Id; contentJson: string }) -> NoteDoc`
- `file_set_rating(input: { id: Id; rating: number }) -> FileItem`
- `file_set_rating_bulk(input: { ids: Id[]; rating: number }) -> void`

`PersonInput = { fullName: string; title?; organization?; email?; phone?; avatarPath?; bio? }`

### M3 — arama & önizleme
- `search(query: SearchQuery) -> Page<FileItem>`  *(file_list ile aynı; komut paleti çok-tipli sonuç için ↓)*
- `search_global(text: string) -> { files: FileItem[]; tags: Tag[]; persons: Person[]; collections: Collection[] }`

### M4 — sürüm, aktivite, çöp (sırası gelince detaylanır)
- `version_list(fileId: Id) -> Version[]`
- `version_restore(input: { fileId: Id; versionId: Id }) -> FileItem`
- `activity_list(input?: { actorId?: Id; objectType?: string; since?: IsoDate; limit?: number }) -> ActivityItem[]`
- `activity_undo(activityId: Id) -> void`
- `file_move_to_trash(input: { ids: Id[] }) -> void`
- `trash_list() -> FileItem[]`
- `file_restore(input: { ids: Id[] }) -> void`
- `file_delete_permanent(input: { ids: Id[] }) -> void`

### M5 — P2P & işbirliği (sırası gelince detaylanır)
- `member_list() -> { person: Person; role: Role; online: boolean }[]`
- `invite_create(input: { role: Role; expiresInDays: number }) -> { link: string; expiresAt: IsoDate }`
- `invite_accept(input: { link: string }) -> { libraryId: Id }`
- `member_set_role(input: { personId: Id; role: Role }) -> void`
- `member_remove(personId: Id) -> void`
- `sync_status() -> SyncStatus`
- `conflict_list() -> Conflict[]`
- `conflict_resolve(input: { conflictId: Id; choice: 'mine' | 'theirs' | 'merge'; mergedValue?: string }) -> void`

### M6 — güncelleme
- `update_check() -> { available: boolean; version?: string }`
- `update_install() -> void`

---

## 3. Events (backend `emit` → frontend `listen`)

| Event adı | Payload | Ne zaman |
|-----------|---------|----------|
| `import:progress` | `ImportProgress` | İçe aktarma boyunca |
| `volume:changed` | `Volume` | Disk takıldı/çıkarıldı/yeniden tarandı |
| `activity:new` | `ActivityItem` | Yeni aktivite (M4) |
| `sync:status` | `SyncStatus` | Senkron durumu değişti (M5) |
| `conflict:new` | `Conflict` | Yeni çatışma (M5) |
| `update:available` | `{ version: string }` | Güncelleme bulundu (M6) |

---

## 4. Mock stratejisi (FE bekleme yapmasın)

`src/lib/api/` yapısı:

```
src/lib/api/
├── types.ts     ← bu dökümandaki TÜM tipler (tek kaynak)
├── client.ts    ← gerçek: invoke<...>(cmd, args) + event listen sarmalayıcıları
├── mock.ts      ← sahte: aynı imzalar, bellek içi veri + sahte ilerleme event'leri
└── index.ts     ← export const api = USE_MOCK ? mock : client
```

- `api` nesnesi her komut için tiplenmiş bir metoda sahiptir: `api.fileList(query)`, `api.tagAssign(...)`, `api.onImportProgress(cb)` vb.
- `USE_MOCK` bir flag (örn. `import.meta.env.VITE_USE_MOCK`). Backend bir komutu bitirince o komut gerçek client'ta hazırdır; FE flag'i kapatınca ya da komut-bazlı geçişle gerçeğe döner. **Tipler aynı olduğu için ekran kodu değişmez.**
- Mock, gerçekçi örnek veri (dosyalar, etiketler, kişiler) ve sahte `import:progress` akışı üretir ki tüm ekranlar (boş + dolu + yükleniyor + hata) geliştirilip test edilebilsin.

> **Kural:** Ekran bileşenleri **doğrudan `invoke` çağırmaz**; her zaman `api` katmanını kullanır. Bu, mock↔gerçek geçişini ve testi mümkün kılar.

---

*Sözleşme M0–M3 için bağlayıcıdır. M4–M6 imzaları taslaktır; o milestone'a gelince kesinleşir.*
