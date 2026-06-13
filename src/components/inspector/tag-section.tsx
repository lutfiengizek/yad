// Inspector etiket bölümü: atanmış etiketler (kaldırılabilir) + ekle/oluştur (combobox).

import { useState } from "react";
import { PlusIcon, TagIcon, XIcon } from "lucide-react";

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
import { useTagStore } from "@/stores/tag-store";

export function TagSection({ file }: { file: FileItem }) {
  const canEdit = useCanEdit();
  const tags = useTagStore((s) => s.tags);
  const assign = useTagStore((s) => s.assign);
  const unassign = useTagStore((s) => s.unassign);
  const create = useTagStore((s) => s.create);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const assigned = tags.filter((tag) => file.tagIds.includes(tag.id));
  const available = tags.filter((tag) => !file.tagIds.includes(tag.id));
  const filtered = available.filter((tag) =>
    tag.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canCreate =
    query.trim().length > 0 &&
    !tags.some((tag) => tag.name.toLowerCase() === query.trim().toLowerCase());

  function reset() {
    setOpen(false);
    setQuery("");
  }

  async function addExisting(tagId: string) {
    await assign([file.id], tagId);
    reset();
  }

  async function createAndAdd() {
    const tag = await create({ name: query.trim(), type: "free" });
    await assign([file.id], tag.id);
    reset();
  }

  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs">{t("inspector.tags")}</span>
      <div className="flex flex-wrap gap-1.5">
        {assigned.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
            {tag.name}
            {canEdit && (
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => void unassign([file.id], tag.id)}
                aria-label={`${tag.name} ${t("inspector.remove")}`}
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
              {t("inspector.addTag")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("inspector.searchTag")}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {filtered.length === 0 && !canCreate && (
                  <CommandEmpty>{t("inspector.noResults")}</CommandEmpty>
                )}
                <CommandGroup>
                  {filtered.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => void addExisting(tag.id)}
                    >
                      <TagIcon className="size-3.5" />
                      {tag.name}
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
