import { Fragment } from "react";
import {
  ClockIcon,
  FolderIcon,
  GalleryVerticalEndIcon,
  HardDriveIcon,
  LayersIcon,
  PlusIcon,
  TagIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { PersonFormDialog } from "@/components/person/person-form-dialog";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { SearchQuery, Tag, Volume } from "@/lib/api/types";
import { initials } from "@/lib/person";
import { useAppStore } from "@/stores/app-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useFileStore } from "@/stores/file-store";
import { usePersonStore } from "@/stores/person-store";
import { useTagStore } from "@/stores/tag-store";
import { useVolumeStore } from "@/stores/volume-store";
import { CreateCollectionDialog } from "./create-collection-dialog";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="text-muted-foreground text-xs tabular-nums">{count}</span>
  );
}

function VolumeStatusDot({ status }: { status: Volume["status"] }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "connected"
          ? "bg-primary"
          : "border-muted-foreground/40 border",
      )}
    />
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground/70 px-2 py-1 text-xs">{label}</p>
  );
}

export function AppSidebar() {
  const volumes = useVolumeStore((s) => s.volumes);
  const tags = useTagStore((s) => s.tags);
  const collections = useCollectionStore((s) => s.collections);
  const persons = usePersonStore((s) => s.persons);
  const activeKey = useFileStore((s) => s.activeKey);
  const selectView = useFileStore((s) => s.selectView);
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);

  const rootTags = tags.filter((tag) => !tag.parentId);

  // Dosya görünümüne dön (kişi sayfasından çık) + sorguyu uygula.
  function openFiles(key: string, query: SearchQuery) {
    setRoute({ name: "files" });
    void selectView(key, query);
  }

  const isFiles = route.name === "files";

  function TagButton({ tag, child }: { tag: Tag; child?: boolean }) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isFiles && activeKey === `tag:${tag.id}`}
          className={cn(child && "pl-6")}
          onClick={() => openFiles(`tag:${tag.id}`, { tagIds: [tag.id] })}
        >
          <TagIcon />
          <span className="flex-1 truncate text-left">{tag.name}</span>
          <CountBadge count={tag.count} />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border border-b">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{t("app.name")}</span>
            <span className="text-muted-foreground text-xs">
              {t("app.tagline")}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* KÜTÜPHANE */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionLibrary")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isFiles && activeKey === "all"}
                  onClick={() => openFiles("all", {})}
                >
                  <LayersIcon />
                  <span>{t("library.all")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isFiles && activeKey === "recent"}
                  onClick={() =>
                    openFiles("recent", {
                      sortBy: "addedAt",
                      sortDir: "desc",
                    })
                  }
                >
                  <ClockIcon />
                  <span>{t("library.recent")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* KOLEKSİYONLAR */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("library.sectionCollections")}
          </SidebarGroupLabel>
          <CreateCollectionDialog />
          <SidebarGroupContent>
            {collections.length === 0 ? (
              <EmptyHint label={t("library.noCollections")} />
            ) : (
              <SidebarMenu>
                {collections.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton
                      isActive={isFiles && activeKey === `col:${c.id}`}
                      onClick={() =>
                        openFiles(`col:${c.id}`, { collectionId: c.id })
                      }
                    >
                      <FolderIcon />
                      <span className="flex-1 truncate text-left">
                        {c.name}
                      </span>
                      <CountBadge count={c.count} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ETİKETLER */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionTags")}</SidebarGroupLabel>
          <SidebarGroupContent>
            {rootTags.length === 0 ? (
              <EmptyHint label={t("library.noTags")} />
            ) : (
              <SidebarMenu>
                {rootTags.map((tag) => (
                  <Fragment key={tag.id}>
                    <TagButton tag={tag} />
                    {tags
                      .filter((c) => c.parentId === tag.id)
                      .map((child) => (
                        <TagButton key={child.id} tag={child} child />
                      ))}
                  </Fragment>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* KİŞİLER */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionPersons")}</SidebarGroupLabel>
          <PersonFormDialog
            trigger={
              <SidebarGroupAction title={t("library.addPerson")}>
                <PlusIcon />
              </SidebarGroupAction>
            }
          />
          <SidebarGroupContent>
            {persons.length === 0 ? (
              <EmptyHint label={t("library.noPersons")} />
            ) : (
              <SidebarMenu>
                {persons.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton
                      isActive={
                        route.name === "person" && route.personId === p.id
                      }
                      onClick={() =>
                        setRoute({ name: "person", personId: p.id })
                      }
                    >
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[9px]">
                          {initials(p.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-left">
                        {p.fullName}
                      </span>
                      <CountBadge count={p.fileCount} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* VOLUME'LAR */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionVolumes")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {volumes.map((vol) => (
                <SidebarMenuItem key={vol.id}>
                  <SidebarMenuButton
                    isActive={isFiles && activeKey === `vol:${vol.id}`}
                    className={cn(vol.status === "offline" && "opacity-60")}
                    onClick={() =>
                      openFiles(`vol:${vol.id}`, { volumeId: vol.id })
                    }
                  >
                    <HardDriveIcon />
                    <span className="flex-1 truncate text-left">
                      {vol.name}
                    </span>
                    <VolumeStatusDot status={vol.status} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
        <p className="text-muted-foreground px-2 py-1 text-xs">
          {t("app.name")} · {t("app.version")}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
