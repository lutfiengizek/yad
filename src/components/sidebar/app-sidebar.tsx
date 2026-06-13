import {
  ClockIcon,
  FolderIcon,
  HardDriveIcon,
  LayersIcon,
  PlusIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { Volume } from "@/lib/api/types";
import { useFileStore } from "@/stores/file-store";
import { useVolumeStore } from "@/stores/volume-store";

function VolumeStatusDot({ status }: { status: Volume["status"] }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "connected"
          ? "bg-primary"
          : "border-muted-foreground/50 border",
      )}
    />
  );
}

export function AppSidebar() {
  const volumes = useVolumeStore((s) => s.volumes);
  const activeKey = useFileStore((s) => s.activeKey);
  const selectView = useFileStore((s) => s.selectView);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <span className="text-lg font-bold">{t("app.name")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

        {/* KOLEKSİYONLAR — CRUD M2 */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("library.sectionCollections")}
          </SidebarGroupLabel>
          <SidebarGroupAction title={t("common.add")} aria-disabled>
            <PlusIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground">
                  <FolderIcon />
                  <span>—</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ETİKETLER — CRUD M2 */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionTags")}</SidebarGroupLabel>
          <SidebarGroupAction title={t("common.add")} aria-disabled>
            <PlusIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground">
                  <TagIcon />
                  <span>—</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* KİŞİLER — CRUD M2 */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("library.sectionPersons")}</SidebarGroupLabel>
          <SidebarGroupAction title={t("common.add")} aria-disabled>
            <PlusIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground">
                  <UsersIcon />
                  <span>—</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
                    <span className="flex-1 truncate text-left">{vol.name}</span>
                    <VolumeStatusDot status={vol.status} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <span className="text-muted-foreground text-xs">
                {t("app.name")} {t("app.version")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
