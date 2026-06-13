// Mock backend: aynı Api imzaları, bellek-içi durum ve sahte ilerleme event'leri.
// Backend hazır olmadan tüm ekranlar (boş/dolu/yükleniyor/hata) geliştirilebilsin diye.
// VITE_MOCK_EMPTY=true ile boş durumdan (onboarding) başlar.

import type { Api } from "./contract";
import { MockEventBus } from "./events";
import {
  NOW,
  defaultSettings,
  defaultSyncStatus,
  sampleActivities,
  sampleCollections,
  sampleConflicts,
  sampleFiles,
  sampleIdentity,
  sampleLibrary,
  sampleMembers,
  sampleNotes,
  samplePersons,
  sampleTags,
  sampleVersions,
  sampleVolumes,
} from "./mock-fixtures";
import type {
  ActivityItem,
  Collection,
  Conflict,
  FileItem,
  FileKind,
  Identity,
  ImportFilesInput,
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
  tags: Tag[] = START_EMPTY ? [] : clone(sampleTags);
  collections: Collection[] = START_EMPTY ? [] : clone(sampleCollections);
  persons: Person[] = START_EMPTY ? [] : clone(samplePersons);
  notes: NoteDoc[] = START_EMPTY ? [] : clone(sampleNotes);
  versions: Version[] = START_EMPTY ? [] : clone(sampleVersions);
  activities: ActivityItem[] = START_EMPTY ? [] : clone(sampleActivities);
  trashedFiles: FileItem[] = [];
  trashedAt: Record<string, string> = {};
  members: MemberInfo[] = START_EMPTY ? [] : clone(sampleMembers);
  conflicts: Conflict[] = START_EMPTY ? [] : clone(sampleConflicts);
  syncStatus: SyncStatus = clone(defaultSyncStatus);
  bus = new MockEventBus();
  counters = {
    library: 1,
    volume: 2,
    batch: 0,
    file: sampleFiles.length,
    tag: 0,
    collection: 0,
    person: 0,
    activity: 0,
    version: 0,
  };
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

// count alanları dosyalardan türetilir (atama değişince güncel kalır).
function tagWithCount(tag: Tag): Tag {
  return {
    ...tag,
    count: state.files.filter((f) => f.tagIds.includes(tag.id)).length,
  };
}
function collectionWithCount(c: Collection): Collection {
  return {
    ...c,
    count: state.files.filter((f) => f.collectionIds.includes(c.id)).length,
  };
}
function personWithCount(p: Person): Person {
  return {
    ...p,
    fileCount: state.files.filter((f) => f.personIds.includes(p.id)).length,
  };
}

// Yeni aktivite üret + activity:new yay.
function pushActivity(
  a: Pick<ActivityItem, "action" | "objectType" | "objectId" | "objectName"> &
    Partial<Pick<ActivityItem, "params" | "undoable">>,
): void {
  const item: ActivityItem = {
    id: `act-new-${++state.counters.activity}`,
    actorId: state.identity?.id ?? "person-self",
    actorName: state.identity?.displayName ?? "Ben",
    createdAt: NOW,
    undoable: false,
    ...a,
  };
  state.activities.unshift(item);
  state.bus.emit("activity:new", item);
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

  // --- M2: etiketler ---
  tagList: () => delay(state.tags.map(tagWithCount)),

  tagCreate: (input) => {
    const tag: Tag = {
      id: `tag-new-${++state.counters.tag}`,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      color: input.color,
      count: 0,
    };
    state.tags.push(tag);
    return delay(clone(tag));
  },

  tagRename: ({ id, name }) => {
    const tag = state.tags.find((t) => t.id === id);
    if (!tag) throw { code: "not_found", message: `Etiket bulunamadı: ${id}` };
    tag.name = name;
    return delay(tagWithCount(tag));
  },

  tagDelete: (id) => {
    state.tags = state.tags.filter((t) => t.id !== id);
    state.files.forEach((f) => {
      f.tagIds = f.tagIds.filter((t) => t !== id);
    });
    return delay(undefined);
  },

  tagAssign: ({ fileIds, tagId }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id) && !f.tagIds.includes(tagId)) {
        f.tagIds.push(tagId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  tagUnassign: ({ fileIds, tagId }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id)) {
        f.tagIds = f.tagIds.filter((t) => t !== tagId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  tagSuggest: (fileId) => {
    const file = state.files.find((f) => f.id === fileId);
    const assigned = new Set(file?.tagIds ?? []);
    const suggestions = state.tags
      .filter((t) => !assigned.has(t.id))
      .slice(0, 9)
      .map(tagWithCount);
    return delay(suggestions);
  },

  // --- M2: koleksiyonlar ---
  collectionList: () => delay(state.collections.map(collectionWithCount)),

  collectionCreate: (input) => {
    const collection: Collection = {
      id: `col-new-${++state.counters.collection}`,
      name: input.name,
      parentId: input.parentId,
      icon: input.icon,
      count: 0,
    };
    state.collections.push(collection);
    return delay(clone(collection));
  },

  collectionRename: ({ id, name }) => {
    const c = state.collections.find((x) => x.id === id);
    if (!c) throw { code: "not_found", message: `Koleksiyon bulunamadı: ${id}` };
    c.name = name;
    return delay(collectionWithCount(c));
  },

  collectionDelete: (id) => {
    state.collections = state.collections.filter((c) => c.id !== id);
    state.files.forEach((f) => {
      f.collectionIds = f.collectionIds.filter((c) => c !== id);
    });
    return delay(undefined);
  },

  collectionAddFiles: ({ collectionId, fileIds }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id) && !f.collectionIds.includes(collectionId)) {
        f.collectionIds.push(collectionId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  collectionRemoveFiles: ({ collectionId, fileIds }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id)) {
        f.collectionIds = f.collectionIds.filter((c) => c !== collectionId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  // --- M2: kişiler ---
  personList: () => delay(state.persons.map(personWithCount)),

  personGet: (id) => {
    const p = state.persons.find((x) => x.id === id);
    if (!p) throw { code: "not_found", message: `Kişi bulunamadı: ${id}` };
    return delay(personWithCount(p));
  },

  personCreate: (input) => {
    const person: Person = {
      id: `person-new-${++state.counters.person}`,
      ...input,
      fileCount: 0,
    };
    state.persons.push(person);
    return delay(clone(person));
  },

  personUpdate: ({ id, ...patch }) => {
    const p = state.persons.find((x) => x.id === id);
    if (!p) throw { code: "not_found", message: `Kişi bulunamadı: ${id}` };
    Object.assign(p, patch);
    return delay(personWithCount(p));
  },

  personDelete: (id) => {
    state.persons = state.persons.filter((p) => p.id !== id);
    state.files.forEach((f) => {
      f.personIds = f.personIds.filter((p) => p !== id);
    });
    return delay(undefined);
  },

  personLink: ({ fileIds, personId }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id) && !f.personIds.includes(personId)) {
        f.personIds.push(personId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  personUnlink: ({ fileIds, personId }) => {
    state.files.forEach((f) => {
      if (fileIds.includes(f.id)) {
        f.personIds = f.personIds.filter((p) => p !== personId);
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  // --- M2: notlar ---
  noteGet: (fileId) => {
    const note = state.notes.find((n) => n.fileId === fileId);
    return delay(note ? clone(note) : null);
  },

  noteSet: ({ fileId, contentJson }) => {
    let note = state.notes.find((n) => n.fileId === fileId);
    if (note) {
      note.contentJson = contentJson;
      note.updatedAt = NOW;
    } else {
      note = {
        fileId,
        contentJson,
        updatedAt: NOW,
        updatedBy: state.identity?.id ?? "person-self",
      };
      state.notes.push(note);
    }
    const file = state.files.find((f) => f.id === fileId);
    if (file) file.hasNote = true;
    return delay(clone(note));
  },

  // --- M2: rating ---
  fileSetRating: ({ id, rating }) => {
    const f = findFile(id);
    f.rating = rating;
    f.modifiedAt = NOW;
    return delay(clone(f));
  },

  fileSetRatingBulk: ({ ids, rating }) => {
    state.files.forEach((f) => {
      if (ids.includes(f.id)) {
        f.rating = rating;
        f.modifiedAt = NOW;
      }
    });
    return delay(undefined);
  },

  // --- M4: sürüm ---
  versionList: (fileId) =>
    delay(clone(state.versions.filter((v) => v.fileId === fileId))),

  versionRestore: ({ fileId, versionId }) => {
    const version = state.versions.find((v) => v.id === versionId);
    const file = findFile(fileId);
    if (!version) {
      throw { code: "not_found", message: `Sürüm bulunamadı: ${versionId}` };
    }
    state.versions.forEach((v) => {
      if (v.fileId === fileId) v.isCurrent = false;
    });
    state.versions.unshift({
      id: `ver-new-${++state.counters.version}`,
      fileId,
      contentHash: version.contentHash,
      sizeBytes: version.sizeBytes,
      label: `${version.label} (geri yüklendi)`,
      authorId: state.identity?.id ?? "person-self",
      authorName: state.identity?.displayName ?? "Ben",
      createdAt: NOW,
      isCurrent: true,
    });
    file.contentHash = version.contentHash;
    file.sizeBytes = version.sizeBytes;
    file.modifiedAt = NOW;
    pushActivity({
      action: "version.restore",
      objectType: "file",
      objectId: fileId,
      objectName: file.name,
    });
    return delay(clone(file));
  },

  // --- M4: aktivite ---
  activityList: (input) => {
    let items = [...state.activities];
    if (input?.actorId)
      items = items.filter((a) => a.actorId === input.actorId);
    if (input?.objectType)
      items = items.filter((a) => a.objectType === input.objectType);
    if (input?.since)
      items = items.filter((a) => a.createdAt >= input.since!);
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (input?.limit) items = items.slice(0, input.limit);
    return delay(clone(items));
  },

  activityUndo: (activityId) => {
    const activity = state.activities.find((a) => a.id === activityId);
    if (activity?.action === "file.trash") {
      const restored = state.trashedFiles.find(
        (f) => f.id === activity.objectId,
      );
      if (restored) {
        state.trashedFiles = state.trashedFiles.filter(
          (f) => f.id !== restored.id,
        );
        delete state.trashedAt[restored.id];
        state.files.unshift(restored);
      }
      state.activities = state.activities.filter((a) => a.id !== activityId);
    }
    return delay(undefined);
  },

  // --- M4: çöp ---
  fileMoveToTrash: ({ ids }) => {
    ids.forEach((id) => {
      const file = state.files.find((f) => f.id === id);
      if (!file) return;
      file.modifiedAt = NOW;
      state.files = state.files.filter((f) => f.id !== id);
      state.trashedFiles.unshift(file);
      state.trashedAt[id] = NOW;
      pushActivity({
        action: "file.trash",
        objectType: "file",
        objectId: id,
        objectName: file.name,
        undoable: true,
      });
    });
    return delay(undefined);
  },

  trashList: () => delay(clone(state.trashedFiles)),

  fileRestore: ({ ids }) => {
    ids.forEach((id) => {
      const file = state.trashedFiles.find((f) => f.id === id);
      if (!file) return;
      state.trashedFiles = state.trashedFiles.filter((f) => f.id !== id);
      delete state.trashedAt[id];
      state.files.unshift(file);
    });
    return delay(undefined);
  },

  fileDeletePermanent: ({ ids }) => {
    state.trashedFiles = state.trashedFiles.filter((f) => !ids.includes(f.id));
    state.versions = state.versions.filter((v) => !ids.includes(v.fileId));
    state.notes = state.notes.filter((n) => !ids.includes(n.fileId));
    ids.forEach((id) => delete state.trashedAt[id]);
    return delay(undefined);
  },

  // --- M5: işbirliği ---
  memberList: () => delay(clone(state.members)),

  memberSetRole: ({ personId, role }) => {
    const member = state.members.find((m) => m.person.id === personId);
    if (member) member.role = role;
    return delay(undefined);
  },

  memberRemove: (personId) => {
    state.members = state.members.filter((m) => m.person.id !== personId);
    return delay(undefined);
  },

  inviteCreate: ({ role, expiresInDays }) => {
    const expiresAt = new Date(
      Date.parse(NOW) + expiresInDays * 86_400_000,
    ).toISOString();
    return delay({
      link: `yad-invite:mock-${role}-${expiresInDays}d`,
      expiresAt,
    });
  },

  inviteAccept: () => delay({ libraryId: "lib-1" }),

  syncStatus: () => delay(clone(state.syncStatus)),

  conflictList: () => delay(clone(state.conflicts)),

  conflictResolve: ({ conflictId, choice, mergedValue }) => {
    const conflict = state.conflicts.find((c) => c.id === conflictId);
    if (conflict && conflict.field === "rating") {
      const value =
        choice === "mine"
          ? conflict.mine
          : choice === "theirs"
            ? conflict.theirs
            : (mergedValue ?? conflict.mine);
      const file = state.files.find((f) => f.id === conflict.fileId);
      if (file) file.rating = Number(value) || 0;
    }
    state.conflicts = state.conflicts.filter((c) => c.id !== conflictId);
    return delay(undefined);
  },

  // --- M3: arama ---
  search: (query) => mockApi.fileList(query),

  searchGlobal: (text) => {
    const q = text.trim().toLowerCase();
    if (!q) {
      return delay({ files: [], tags: [], persons: [], collections: [] });
    }
    return delay({
      files: clone(
        state.files.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8),
      ),
      tags: state.tags
        .filter((t) => t.name.toLowerCase().includes(q))
        .slice(0, 6)
        .map(tagWithCount),
      persons: state.persons
        .filter((p) => p.fullName.toLowerCase().includes(q))
        .slice(0, 6)
        .map(personWithCount),
      collections: state.collections
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 6)
        .map(collectionWithCount),
    });
  },

  // --- Events ---
  onImportProgress: (cb) => state.bus.on("import:progress", cb),
  onVolumeChanged: (cb) => state.bus.on("volume:changed", cb),
  onActivityNew: (cb) => state.bus.on("activity:new", cb),
  onSyncStatus: (cb) => state.bus.on("sync:status", cb),
  onConflictNew: (cb) => state.bus.on("conflict:new", cb),
};
