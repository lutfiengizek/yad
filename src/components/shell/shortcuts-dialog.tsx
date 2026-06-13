// Klavye kısayolları referansı (? tuşu).

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import { useAppStore } from "@/stores/app-store";

function Key({ children }: { children: string }) {
  return (
    <kbd className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span>{label}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
      </span>
    </div>
  );
}

export function ShortcutsDialog() {
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>

        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            {t("shortcuts.groupView")}
          </p>
          <Shortcut label={t("shortcuts.grid")} keys={["G"]} />
          <Shortcut label={t("shortcuts.list")} keys={["L"]} />
          <Shortcut label={t("shortcuts.loupe")} keys={["E"]} />
          <Shortcut label={t("shortcuts.compare")} keys={["C"]} />
          <Shortcut label={t("shortcuts.preview")} keys={["Space"]} />
        </div>

        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            {t("shortcuts.groupEdit")}
          </p>
          <Shortcut label={t("shortcuts.trash")} keys={["Del"]} />
        </div>

        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            {t("shortcuts.groupGeneral")}
          </p>
          <Shortcut label={t("shortcuts.search")} keys={["Ctrl", "K"]} />
          <Shortcut label={t("shortcuts.sidebar")} keys={["Ctrl", "B"]} />
          <Shortcut label={t("shortcuts.help")} keys={["?"]} />
          <Shortcut label={t("shortcuts.close")} keys={["Esc"]} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
