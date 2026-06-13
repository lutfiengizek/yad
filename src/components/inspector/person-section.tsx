// Inspector kişi bölümü: dosyaya bağlı kişiler (çözülebilir) + bağla/oluştur.

import { useState } from "react";
import { PlusIcon, UserIcon, XIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { initials } from "@/lib/person";
import { usePersonStore } from "@/stores/person-store";

export function PersonSection({ file }: { file: FileItem }) {
  const canEdit = useCanEdit();
  const persons = usePersonStore((s) => s.persons);
  const create = usePersonStore((s) => s.create);
  const link = usePersonStore((s) => s.link);
  const unlink = usePersonStore((s) => s.unlink);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const linked = persons.filter((p) => file.personIds.includes(p.id));
  const available = persons.filter((p) => !file.personIds.includes(p.id));
  const filtered = available.filter((p) =>
    p.fullName.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canCreate =
    query.trim().length > 0 &&
    !persons.some(
      (p) => p.fullName.toLowerCase() === query.trim().toLowerCase(),
    );

  function reset() {
    setOpen(false);
    setQuery("");
  }

  async function addExisting(id: string) {
    await link([file.id], id);
    reset();
  }

  async function createAndAdd() {
    const person = await create({ fullName: query.trim() });
    await link([file.id], person.id);
    reset();
  }

  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs">
        {t("inspector.persons")}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {linked.map((p) => (
          <Badge key={p.id} variant="secondary" className="gap-1 pr-1 pl-1">
            <Avatar className="size-4">
              <AvatarFallback className="text-[8px]">
                {initials(p.fullName)}
              </AvatarFallback>
            </Avatar>
            {p.fullName}
            {canEdit && (
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => void unlink([file.id], p.id)}
                aria-label={`${p.fullName} ${t("inspector.remove")}`}
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
              {t("inspector.addPerson")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("inspector.searchPerson")}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {filtered.length === 0 && !canCreate && (
                  <CommandEmpty>{t("inspector.noResults")}</CommandEmpty>
                )}
                <CommandGroup>
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={() => void addExisting(p.id)}
                    >
                      <UserIcon className="size-3.5" />
                      {p.fullName}
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
