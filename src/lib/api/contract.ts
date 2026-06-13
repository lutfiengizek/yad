// Api arayüzü: gerçek client (client.ts) ve mock (mock.ts) bu imzaya uyar.
// Ekran kodu yalnızca bu arayüzü görür; mock↔gerçek geçişi index.ts'te yapılır.
// Milestone ilerledikçe genişler (M1: kütüphane/dosya, M2: organizasyon, ...).

import type {
  AppInitResult,
  BatchHandle,
  FileItem,
  Identity,
  IdentityInput,
  ImportFilesInput,
  ImportProgress,
  Library,
  LibraryCreateInput,
  Page,
  SearchQuery,
  Settings,
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

  // Events (backend emit → frontend listen) — payload tipleri sözleşmeden.
  onImportProgress(cb: (p: ImportProgress) => void): Unsubscribe;
  onVolumeChanged(cb: (v: Volume) => void): Unsubscribe;
}
