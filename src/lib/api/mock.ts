// Mock backend: aynı Api imzaları, bellek-içi durum ve sahte ilerleme event'leri.
// Backend hazır olmadan tüm ekranlar (boş/dolu/yükleniyor/hata) geliştirilebilsin diye.
// VITE_MOCK_EMPTY=true ile boş durumdan (onboarding) başlar.

import type { Api } from "./contract";
import { MockEventBus } from "./events";
import { defaultSettings, sampleIdentity, sampleLibrary } from "./mock-fixtures";
import type { Identity, Library, Settings } from "./types";

const MOCK_DELAY = import.meta.env.MODE === "test" ? 0 : 140;
const START_EMPTY = import.meta.env.VITE_MOCK_EMPTY === "true";

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class MockState {
  identity: Identity | null = START_EMPTY ? null : clone(sampleIdentity);
  settings: Settings = clone(defaultSettings);
  libraries: Library[] = START_EMPTY ? [] : [clone(sampleLibrary)];
  bus = new MockEventBus();
}

// Modül ömrü boyunca tek durum (gerçek backend gibi kalıcı davranır).
const state = new MockState();

export const mockApi: Api = {
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

  onImportProgress: (cb) => state.bus.on("import:progress", cb),
  onVolumeChanged: (cb) => state.bus.on("volume:changed", cb),
};
