// Mock için deterministik örnek veri. Tarih sabittir (testler stabil olsun).
// Milestone ilerledikçe genişler (M1: volume/dosya fixture'ları).

import type { Identity, Library, Settings } from "./types";

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
