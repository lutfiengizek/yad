// Alt durum çubuğu: volume/eş/senkron/sürüm/bildirim göstergeleri.
// M0'da statik placeholder; gerçek veriler M1 (volume) ve M5 (senkron) ile bağlanır.

import { BellIcon, HardDriveIcon, RefreshCwIcon, UsersIcon } from "lucide-react";

import { t } from "@/i18n";

export function StatusBar() {
  return (
    <footer className="text-muted-foreground bg-background flex h-7 shrink-0 items-center gap-4 border-t px-3 text-xs">
      <span className="flex items-center gap-1.5">
        <HardDriveIcon className="size-3.5" />
        <span className="tabular-nums">0/0</span> {t("statusbar.volumes")}
      </span>
      <span className="flex items-center gap-1.5">
        <UsersIcon className="size-3.5" />
        <span className="tabular-nums">0</span> {t("statusbar.peers")}
      </span>
      <span className="flex items-center gap-1.5">
        <RefreshCwIcon className="size-3.5" />
        {t("statusbar.synced")}
      </span>
      <span className="ml-auto">{t("app.version")}</span>
      <BellIcon className="size-3.5" aria-label={t("statusbar.notifications")} />
    </footer>
  );
}
