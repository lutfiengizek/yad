// Kişi oluştur/düzenle diyaloğu. `trigger` ile tetiklenir; `person` verilirse düzenleme modu.

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import type { Person } from "@/lib/api/types";
import { usePersonStore } from "@/stores/person-store";

export function PersonFormDialog({
  trigger,
  person,
}: {
  trigger: ReactNode;
  person?: Person;
}) {
  const create = usePersonStore((s) => s.create);
  const update = usePersonStore((s) => s.update);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(person?.fullName ?? "");
  const [title, setTitle] = useState(person?.title ?? "");
  const [organization, setOrganization] = useState(person?.organization ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");

  async function submit() {
    if (!fullName.trim()) return;
    const input = {
      fullName: fullName.trim(),
      title: title.trim() || undefined,
      organization: organization.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    if (person) await update(person.id, input);
    else await create(input);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {person ? t("person.edit") : t("person.new")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            {t("person.fullName")}
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("person.title")}
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("person.organization")}
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("person.email")}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("person.phone")}
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("common.cancel")}</Button>
          </DialogClose>
          <Button onClick={() => void submit()} disabled={!fullName.trim()}>
            {t("person.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
