import { Fragment } from "react";
import {
  ClockIcon,
  GalleryVerticalEndIcon,
  HardDriveIcon,
  LayersIcon,
  TagIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { Tag, Volume } from "@/lib/api/types";
import { useFileStore } from "@/stores/file-store";
import { useTagStore } from "@/stores/tag-store";
import { useVolumeStore } from "@/stores/volume-store";

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
  const activeKey = useFileStore((s) => s.activeKey);
  const selectView = useFileStore((s) => s.selectView);

  const rootTags = tags.filter((tag) => !tag.parentId);

  function TagButton({ tag, child }: { tag: Tag; child?: boolean }) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeKey === `tag:${tag.id}`}
          className={cn(child && "pl-6")}
          onClick={() => selectView(`tag:${tag.id}`, { tagIds: [tag.id] })}
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
                  isActive={activeKey === "all"}
                  onClick={() => selectView("all", {})}
                >
                  <LayersIcon />
                  <span>{t("library.all")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeKey === "recent"}
                  onClick={() =>
                    selectView("recent", {
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

        {/* KOLEKSİYONLAR — M2 */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("library.sectionCollections")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <EmptyHint label={t("library.noCollections")} />
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

        {/* KİŞİLER — M2 */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionPersons")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <EmptyHint label={t("library.noPersons")} />
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
                    isActive={activeKey === `vol:${vol.id}`}
                    className={cn(vol.status === "offline" && "opacity-60")}
                    onClick={() =>
                      selectView(`vol:${vol.id}`, { volumeId: vol.id })
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
