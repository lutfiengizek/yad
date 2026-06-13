// Alt durum çubuğu: volume/eş/senkron/sürüm/bildirim göstergeleri.
// Volume sayısı gerçek veriden; bildirim zili aktivite akışını açar; eş/senkron M5'te.

import { BellIcon, HardDriveIcon, RefreshCwIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { useAppStore } from "@/stores/app-store";
import { useVolumeStore } from "@/stores/volume-store";

export function StatusBar() {
  const volumes = useVolumeStore((s) => s.volumes);
  const setRoute = useAppStore((s) => s.setRoute);
  const connected = volumes.filter((v) => v.status === "connected").length;

  return (
    <footer className="text-muted-foreground bg-background flex h-7 shrink-0 items-center gap-4 border-t px-3 text-xs">
      <span className="flex items-center gap-1.5">
        <HardDriveIcon className="size-3.5" />
        <span className="tabular-nums">
          {connected}/{volumes.length}
        </span>{" "}
        {t("statusbar.volumes")}
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
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t("statusbar.notifications")}
        onClick={() => setRoute({ name: "activity" })}
      >
        <BellIcon className="size-3.5" />
      </Button>
    </footer>
  );
}
