// Ctrl+K global komut paleti: search_global ile çok-tipli sonuç (dosya/etiket/kişi/koleksiyon).
// Seçince ilgili görünüme gider (dosya seç, etiket/koleksiyon filtrele, kişi sayfası).

import { useEffect, useState } from "react";
import { FolderIcon, TagIcon, UserIcon } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileKindIcon } from "@/components/content/file-kind";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { SearchGlobalResult } from "@/lib/api/types";
import { useAppStore } from "@/stores/app-store";
import { useFileStore } from "@/stores/file-store";

const EMPTY: SearchGlobalResult = {
  files: [],
  tags: [],
  persons: [],
  collections: [],
};

export function CommandPalette() {
  const open = useAppStore((s) => s.commandOpen);
  const setOpen = useAppStore((s) => s.setCommandOpen);
  const setRoute = useAppStore((s) => s.setRoute);
  const selectView = useFileStore((s) => s.selectView);
  const select = useFileStore((s) => s.select);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGlobalResult>(EMPTY);

  // Ctrl/Cmd+K aç/kapat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useAppStore.getState().commandOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Debounce'lu arama.
  useEffect(() => {
    if (!query.trim()) {
      setResults(EMPTY);
      return;
    }
    const id = setTimeout(() => {
      void api.searchGlobal(query).then(setResults);
    }, 150);
    return () => clearTimeout(id);
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  async function openFile(id: string) {
    await selectView("all", {});
    select(id);
    setRoute({ name: "files" });
    close();
  }

  function filterView(key: string, query: Parameters<typeof selectView>[1]) {
    setRoute({ name: "files" });
    void selectView(key, query);
    close();
  }

  const { files, tags, persons, collections } = results;
  const hasResults =
    files.length || tags.length || persons.length || collections.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t("command.title")}</DialogTitle>
          <DialogDescription>{t("command.description")}</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("command.placeholder")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim() && !hasResults && (
              <CommandEmpty>{t("command.noResults")}</CommandEmpty>
            )}

            {files.length > 0 && (
              <CommandGroup heading={t("command.files")}>
                {files.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={`file-${f.id}`}
                    onSelect={() => void openFile(f.id)}
                  >
                    <FileKindIcon kind={f.kind} />
                    <span className="truncate">{f.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {tags.length > 0 && (
              <CommandGroup heading={t("command.tags")}>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={`tag-${tag.id}`}
                    onSelect={() =>
                      filterView(`tag:${tag.id}`, { tagIds: [tag.id] })
                    }
                  >
                    <TagIcon />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {persons.length > 0 && (
              <CommandGroup heading={t("command.persons")}>
                {persons.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`person-${p.id}`}
                    onSelect={() => {
                      setRoute({ name: "person", personId: p.id });
                      close();
                    }}
                  >
                    <UserIcon />
                    {p.fullName}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {collections.length > 0 && (
              <CommandGroup heading={t("command.collections")}>
                {collections.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`collection-${c.id}`}
                    onSelect={() =>
                      filterView(`col:${c.id}`, { collectionId: c.id })
                    }
                  >
                    <FolderIcon />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
