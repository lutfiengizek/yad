// Alt durum çubuğu: volume/eş/senkron(popover)/çatışma/sürüm/bildirim göstergeleri.

import { BellIcon, HardDriveIcon, TriangleAlertIcon, UsersIcon } from "lucide-react";

import { SyncPopover } from "@/components/collab/sync-popover";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";
import { useVolumeStore } from "@/stores/volume-store";

export function StatusBar() {
  const volumes = useVolumeStore((s) => s.volumes);
  const setRoute = useAppStore((s) => s.setRoute);
  const setConflictOpen = useAppStore((s) => s.setConflictOpen);
  const sync = useCollabStore((s) => s.sync);
  const conflicts = useCollabStore((s) => s.conflicts);
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
        <span className="tabular-nums">{sync?.peersOnline ?? 0}</span>{" "}
        {t("statusbar.peers")}
      </span>

      <SyncPopover />

      {conflicts.length > 0 && (
        <button
          type="button"
          onClick={() => setConflictOpen(true)}
          className="text-destructive flex items-center gap-1.5 font-medium"
        >
          <TriangleAlertIcon className="size-3.5" />
          <span className="tabular-nums">{conflicts.length}</span>{" "}
          {t("collab.conflictBadge")}
        </button>
      )}

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
