// Sidebar koleksiyon bölümü "+" eylemi: ad girip koleksiyon oluşturur.

import { useState } from "react";
import { PlusIcon } from "lucide-react";

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
import { SidebarGroupAction } from "@/components/ui/sidebar";
import { t } from "@/i18n";
import { useCollectionStore } from "@/stores/collection-store";

export function CreateCollectionDialog() {
  const create = useCollectionStore((s) => s.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function submit() {
    if (!name.trim()) return;
    await create({ name: name.trim() });
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarGroupAction title={t("library.addCollection")}>
          <PlusIcon />
        </SidebarGroupAction>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("library.newCollection")}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("library.collectionName")}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("common.cancel")}</Button>
          </DialogClose>
          <Button onClick={() => void submit()} disabled={!name.trim()}>
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
