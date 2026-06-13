// Inspector koleksiyon bölümü: dosyanın koleksiyonları (kaldırılabilir) + ekle/oluştur.

import { useState } from "react";
import { FolderIcon, PlusIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { t } from "@/i18n";
import type { FileItem } from "@/lib/api/types";
import { useCanEdit } from "@/hooks/use-can-edit";
import { useCollectionStore } from "@/stores/collection-store";

export function CollectionSection({ file }: { file: FileItem }) {
  const canEdit = useCanEdit();
  const collections = useCollectionStore((s) => s.collections);
  const create = useCollectionStore((s) => s.create);
  const addFiles = useCollectionStore((s) => s.addFiles);
  const removeFiles = useCollectionStore((s) => s.removeFiles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const inCollections = collections.filter((c) =>
    file.collectionIds.includes(c.id),
  );
  const available = collections.filter(
    (c) => !file.collectionIds.includes(c.id),
  );
  const filtered = available.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canCreate =
    query.trim().length > 0 &&
    !collections.some(
      (c) => c.name.toLowerCase() === query.trim().toLowerCase(),
    );

  function reset() {
    setOpen(false);
    setQuery("");
  }

  async function addExisting(id: string) {
    await addFiles(id, [file.id]);
    reset();
  }

  async function createAndAdd() {
    const collection = await create({ name: query.trim() });
    await addFiles(collection.id, [file.id]);
    reset();
  }

  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs">
        {t("inspector.collections")}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {inCollections.map((c) => (
          <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
            <FolderIcon className="size-3" />
            {c.name}
            {canEdit && (
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => void removeFiles(c.id, [file.id])}
                aria-label={`${c.name} ${t("inspector.remove")}`}
              >
                <XIcon className="size-3" />
              </button>
            )}
          </Badge>
        ))}

        {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="xs" className="gap-1">
              <PlusIcon className="size-3" />
              {t("inspector.addCollection")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("inspector.searchCollection")}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {filtered.length === 0 && !canCreate && (
                  <CommandEmpty>{t("inspector.noResults")}</CommandEmpty>
                )}
                <CommandGroup>
                  {filtered.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => void addExisting(c.id)}
                    >
                      <FolderIcon className="size-3.5" />
                      {c.name}
                    </CommandItem>
                  ))}
                  {canCreate && (
                    <CommandItem
                      value={`__create__${query}`}
                      onSelect={() => void createAndAdd()}
                    >
                      <PlusIcon className="size-3.5" />
                      {t("inspector.create")}: “{query.trim()}”
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        )}
      </div>
    </div>
  );
}
