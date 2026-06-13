// Üst bar: kenar çubuğu tetikleyici, çalışma alanı seçici (placeholder),
// arama tetikleyici (Ctrl+K paleti M3'te), tema/müfettiş/ayarlar/profil.

import {
  ChevronsUpDownIcon,
  PanelRightIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { t } from "@/i18n";
import { useAppStore } from "@/stores/app-store";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  const setInspectorOpen = useAppStore((s) => s.setInspectorOpen);
  const inspectorOpen = useAppStore((s) => s.inspectorOpen);

  return (
    <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b px-2">
      <SidebarTrigger className="text-muted-foreground" />
      <Separator orientation="vertical" className="h-5" />

      {/* Çalışma alanı seçici (placeholder — kütüphane değiştirme M1'de) */}
      <Button variant="ghost" size="sm" className="gap-1.5">
        <span className="font-semibold">{t("app.name")}</span>
        <ChevronsUpDownIcon className="size-3.5 opacity-60" />
      </Button>

      {/* Arama tetikleyici (komut paleti M3) */}
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground ml-1 hidden w-64 justify-start gap-2 font-normal sm:flex"
      >
        <SearchIcon className="size-4" />
        {t("topbar.search")}
        <kbd className="bg-muted text-muted-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">
          {t("topbar.searchShortcut")}
        </kbd>
      </Button>

      <div className="flex-1" />

      <ThemeToggle />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("topbar.toggleInspector")}
        aria-pressed={inspectorOpen}
        onClick={() => setInspectorOpen(!inspectorOpen)}
      >
        <PanelRightIcon className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("topbar.settings")}>
        <SettingsIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("topbar.profile")}
        className="text-muted-foreground"
      >
        <span className="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-full">
          <UserIcon className="size-4" />
        </span>
      </Button>
    </header>
  );
}
