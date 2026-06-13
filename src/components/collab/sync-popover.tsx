// Senkron durumu popover'ı (alt durum çubuğundan): durum + eşler + bağlantı bilgisi.

import { RefreshCwIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { t } from "@/i18n";
import type { SyncState } from "@/lib/api/types";
import { initials } from "@/lib/person";
import { cn } from "@/lib/utils";
import { useCollabStore } from "@/stores/collab-store";

function stateText(state: SyncState | undefined, message?: string): string {
  switch (state) {
    case "syncing":
      return t("collab.syncSyncing");
    case "offline":
      return t("collab.syncOffline");
    case "error":
      return message ?? t("collab.syncError");
    default:
      return t("collab.syncUpToDate");
  }
}

export function SyncPopover() {
  const sync = useCollabStore((s) => s.sync);
  const members = useCollabStore((s) => s.members);
  const myId = useCollabStore((s) => s.myId);
  const peers = members.filter((m) => m.person.id !== myId);
  const label = stateText(sync?.state, sync?.message);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <RefreshCwIcon className="size-3.5" />
          {sync?.state === "idle"
            ? t("statusbar.synced")
            : label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2">
        <div className="text-sm font-medium">{t("collab.syncTitle")}</div>
        <p className="text-sm">
          {label}
          {sync ? ` · ${sync.peersOnline} ${t("collab.syncWithPeers")}` : ""}
        </p>

        {peers.length > 0 && (
          <div className="space-y-1">
            {peers.map((p) => (
              <div
                key={p.person.id}
                className="flex items-center gap-2 text-xs"
              >
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px]">
                    {initials(p.person.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{p.person.fullName}</span>
                <span
                  className={cn(
                    "ml-auto size-1.5 rounded-full",
                    p.online
                      ? "bg-primary"
                      : "border-muted-foreground/40 border",
                  )}
                />
              </div>
            ))}
          </div>
        )}

        <Separator />
        <p className="text-muted-foreground text-xs">
          {t("collab.syncConnection")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
