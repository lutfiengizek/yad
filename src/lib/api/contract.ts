// Api arayüzü: gerçek client (client.ts) ve mock (mock.ts) bu imzaya uyar.
// Ekran kodu yalnızca bu arayüzü görür; mock↔gerçek geçişi index.ts'te yapılır.
// Milestone ilerledikçe genişler (M1: kütüphane/dosya, M2: organizasyon, ...).

import type {
  AppInitResult,
  BatchHandle,
  Collection,
  FileItem,
  Id,
  Identity,
  IdentityInput,
  ImportFilesInput,
  ImportProgress,
  Library,
  LibraryCreateInput,
  NoteDoc,
  Page,
  Person,
  PersonInput,
  SearchGlobalResult,
  SearchQuery,
  Settings,
  Tag,
  TagType,
  Volume,
} from "./types";

export type Unsubscribe = () => void;

export interface Api {
  // M0 — temel
  appInit(): Promise<AppInitResult>;
  settingsGet(): Promise<Settings>;
  settingsSet(patch: Partial<Settings>): Promise<Settings>;
  identityGet(): Promise<Identity | null>;
  identitySet(input: IdentityInput): Promise<Identity>;

  // M1 — kütüphane, volume, içe aktarma, dosya listeleme
  libraryList(): Promise<Library[]>;
  libraryCreate(input: LibraryCreateInput): Promise<Library>;
  libraryOpen(id: string): Promise<Library>;
  volumeList(libraryId: string): Promise<Volume[]>;
  volumeRescan(volumeId: string): Promise<Volume>;
  importFiles(input: ImportFilesInput): Promise<BatchHandle>;
  importFromClipboard(input: { libraryId: string }): Promise<BatchHandle>;
  fileList(query: SearchQuery): Promise<Page<FileItem>>;
  fileGet(id: string): Promise<FileItem>;
  fileRename(input: { id: string; newName: string }): Promise<FileItem>;
  fileSetSourceUrl(input: { id: string; url: string }): Promise<FileItem>;
  fileOpenExternal(id: string): Promise<void>;
  fileRevealInOs(id: string): Promise<void>;

  // M2 — organizasyon (etiket, koleksiyon, kişi, not, rating)
  tagList(): Promise<Tag[]>;
  tagCreate(input: {
    name: string;
    type: TagType;
    parentId?: Id;
    color?: string;
  }): Promise<Tag>;
  tagRename(input: { id: Id; name: string }): Promise<Tag>;
  tagDelete(id: Id): Promise<void>;
  tagAssign(input: {
    fileIds: Id[];
    tagId: Id;
    applyToChildren?: boolean;
  }): Promise<void>;
  tagUnassign(input: { fileIds: Id[]; tagId: Id }): Promise<void>;
  tagSuggest(fileId: Id): Promise<Tag[]>;

  collectionList(): Promise<Collection[]>;
  collectionCreate(input: {
    name: string;
    parentId?: Id;
    icon?: string;
  }): Promise<Collection>;
  collectionRename(input: { id: Id; name: string }): Promise<Collection>;
  collectionDelete(id: Id): Promise<void>;
  collectionAddFiles(input: {
    collectionId: Id;
    fileIds: Id[];
  }): Promise<void>;
  collectionRemoveFiles(input: {
    collectionId: Id;
    fileIds: Id[];
  }): Promise<void>;

  personList(): Promise<Person[]>;
  personGet(id: Id): Promise<Person>;
  personCreate(input: PersonInput): Promise<Person>;
  personUpdate(input: { id: Id } & Partial<PersonInput>): Promise<Person>;
  personDelete(id: Id): Promise<void>;
  personLink(input: { fileIds: Id[]; personId: Id }): Promise<void>;
  personUnlink(input: { fileIds: Id[]; personId: Id }): Promise<void>;

  noteGet(fileId: Id): Promise<NoteDoc | null>;
  noteSet(input: { fileId: Id; contentJson: string }): Promise<NoteDoc>;

  fileSetRating(input: { id: Id; rating: number }): Promise<FileItem>;
  fileSetRatingBulk(input: { ids: Id[]; rating: number }): Promise<void>;

  // M3 — arama
  search(query: SearchQuery): Promise<Page<FileItem>>;
  searchGlobal(text: string): Promise<SearchGlobalResult>;

  // Events (backend emit → frontend listen) — payload tipleri sözleşmeden.
  onImportProgress(cb: (p: ImportProgress) => void): Unsubscribe;
  onVolumeChanged(cb: (v: Volume) => void): Unsubscribe;
}
