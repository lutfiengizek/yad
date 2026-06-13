// Açılış yüklemesi: ayarlar + kütüphaneler (+volume'lar) + ilk dosya görünümü.
// Tema, kayıtlı ayardan next-themes'e uygulanır.

import { useEffect } from "react";
import { useTheme } from "next-themes";

import { api } from "@/lib/api";
import { useActivityStore } from "@/stores/activity-store";
import { useAppStore } from "@/stores/app-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useFileStore } from "@/stores/file-store";
import { useLibraryStore } from "@/stores/library-store";
import { usePersonStore } from "@/stores/person-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTagStore } from "@/stores/tag-store";

export function useBootstrap() {
  const { setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = api.onActivityNew((a) =>
      useActivityStore.getState().prepend(a),
    );
    void (async () => {
      await useSettingsStore.getState().load();
      await useLibraryStore.getState().load();
      if (cancelled) return;
      const settings = useSettingsStore.getState().settings;
      if (settings) {
        setTheme(settings.theme);
        useAppStore.getState().setViewMode(settings.defaultView);
      }
      await Promise.all([
        useFileStore.getState().selectView("all", {}),
        useTagStore.getState().load(),
        useCollectionStore.getState().load(),
        usePersonStore.getState().load(),
        useActivityStore.getState().load(),
      ]);
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setTheme]);
}
