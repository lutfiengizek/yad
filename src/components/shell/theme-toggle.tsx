// Tema seçici: Açık / Koyu / Sistem. Seçim next-themes'e uygulanır ve
// backend ayarlarına (api.settingsSet) kalıcı yazılır.

import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/i18n";
import { api } from "@/lib/api";

type ThemeOption = "light" | "dark" | "system";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  function choose(theme: ThemeOption) {
    setTheme(theme);
    void api.settingsSet({ theme });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("topbar.theme")}>
          <SunIcon className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => choose("light")}>
          <SunIcon />
          {t("topbar.themeLight")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => choose("dark")}>
          <MoonIcon />
          {t("topbar.themeDark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => choose("system")}>
          <MonitorIcon />
          {t("topbar.themeSystem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
