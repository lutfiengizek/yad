// Davete katıl: davet linkini yapıştır → invite_accept.

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";

export function JoinDialog() {
  const open = useAppStore((s) => s.joinOpen);
  const setOpen = useAppStore((s) => s.setJoinOpen);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!link.trim()) return;
    setBusy(true);
    try {
      await api.inviteAccept({ link: link.trim() });
      await useCollabStore.getState().load();
      toast.success(t("collab.joined"));
      setLink("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collab.joinTitle")}</DialogTitle>
          <DialogDescription>{t("collab.joinHint")}</DialogDescription>
        </DialogHeader>
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t("collab.joinPlaceholder")}
          autoFocus
          className="font-mono text-xs"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("common.cancel")}</Button>
          </DialogClose>
          <Button onClick={() => void accept()} disabled={!link.trim() || busy}>
            {t("collab.joinAccept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
