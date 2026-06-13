// Açılış yüklemesi: ayarlar + kütüphaneler (+volume'lar) + ilk dosya görünümü.
// Tema, kayıtlı ayardan next-themes'e uygulanır.

import { useEffect } from "react";
import { useTheme } from "next-themes";

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
    void (async () => {
      await useSettingsStore.getState().load();
      await useLibraryStore.getState().load();
      if (cancelled) return;
      const settings = useSettingsStore.getState().settings;
      if (settings) setTheme(settings.theme);
      await Promise.all([
        useFileStore.getState().selectView("all", {}),
        useTagStore.getState().load(),
        useCollectionStore.getState().load(),
        usePersonStore.getState().load(),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);
}
