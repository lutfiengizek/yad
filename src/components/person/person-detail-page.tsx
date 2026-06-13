// Kişi kartı detay sayfası: profil (avatar, unvan, iletişim, biyografi) + kişinin dosyaları.

import { useEffect, useState } from "react";
import { ArrowLeftIcon, MailIcon, PhoneIcon } from "lucide-react";

import { FileGrid } from "@/components/content/file-grid";
import { PersonFormDialog } from "@/components/person/person-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { FileItem, Person } from "@/lib/api/types";
import { initials } from "@/lib/person";
import { useAppStore } from "@/stores/app-store";
import { useFileStore } from "@/stores/file-store";
import { usePersonStore } from "@/stores/person-store";
import { useSettingsStore } from "@/stores/settings-store";

const DEFAULT_BADGES = { tag: true, note: true, sync: true, person: true };

export function PersonDetailPage({ personId }: { personId: string }) {
  const setRoute = useAppStore((s) => s.setRoute);
  const select = useFileStore((s) => s.select);
  const selectedId = useFileStore((s) => s.selectedId);
  const settings = useSettingsStore((s) => s.settings);
  const persons = usePersonStore((s) => s.persons);
  const [files, setFiles] = useState<FileItem[]>([]);

  const person: Person | undefined = persons.find((p) => p.id === personId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const page = await api.fileList({ personIds: [personId] });
      if (!cancelled) setFiles(page.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (!person) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRoute({ name: "files" })}
          aria-label={t("onboarding.back")}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="flex-1 truncate text-sm font-semibold">
          {person.fullName}
        </h2>
        <PersonFormDialog
          person={person}
          trigger={
            <Button variant="outline" size="sm">
              {t("common.edit")}
            </Button>
          }
        />
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg font-medium">
                {initials(person.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{person.fullName}</h1>
              {(person.title || person.organization) && (
                <p className="text-muted-foreground text-sm">
                  {[person.title, person.organization]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <div className="text-muted-foreground flex flex-col gap-0.5 pt-1 text-sm">
                {person.email && (
                  <span className="flex items-center gap-1.5">
                    <MailIcon className="size-3.5" />
                    {person.email}
                  </span>
                )}
                {person.phone && (
                  <span className="flex items-center gap-1.5">
                    <PhoneIcon className="size-3.5" />
                    {person.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {person.bio && (
            <p className="font-serif text-sm leading-relaxed">{person.bio}</p>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium">
              {person.fullName} ·{" "}
              <span className="text-muted-foreground tabular-nums">
                {files.length} {t("grid.itemCount")}
              </span>
            </h3>
            <FileGrid
              files={files}
              selectedId={selectedId}
              density={settings?.gridDensity ?? 3}
              badges={settings?.badges ?? DEFAULT_BADGES}
              onSelect={select}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
