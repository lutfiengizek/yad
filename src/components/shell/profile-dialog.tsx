// Profil diyaloğu: yerel kimliği düzenle (identity_set).

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";

export function ProfileDialog() {
  const open = useAppStore((s) => s.profileOpen);
  const setOpen = useAppStore((s) => s.setProfileOpen);
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");

  useEffect(() => {
    if (!open) return;
    void api.identityGet().then((identity) => {
      if (identity) {
        setDisplayName(identity.displayName);
        setOrganization(identity.organization ?? "");
      }
    });
  }, [open]);

  async function save() {
    if (!displayName.trim()) return;
    await api.identitySet({
      displayName: displayName.trim(),
      organization: organization.trim() || undefined,
    });
    await useCollabStore.getState().load();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("topbar.profile")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            {t("onboarding.displayName")}
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("onboarding.organization")}
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("common.cancel")}</Button>
          </DialogClose>
          <Button onClick={() => void save()} disabled={!displayName.trim()}>
            {t("person.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
