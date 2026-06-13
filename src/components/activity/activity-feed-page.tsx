// Aktivite akışı sayfası: BUGÜN/DÜN/DAHA ÖNCE gruplu; aktör + cümle + göreli zaman; geri al.

import { ArrowLeftIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "@/i18n";
import type { ActivityItem } from "@/lib/api/types";
import { activitySentence, dayGroup, type DayGroup } from "@/lib/activity-text";
import { formatRelative } from "@/lib/format";
import { initials } from "@/lib/person";
import { useActivityStore } from "@/stores/activity-store";
import { useAppStore } from "@/stores/app-store";

const GROUP_ORDER: DayGroup[] = ["today", "yesterday", "earlier"];
const GROUP_LABEL: Record<DayGroup, string> = {
  today: "today",
  yesterday: "yesterday",
  earlier: "earlier",
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const undo = useActivityStore((s) => s.undo);
  return (
    <div className="flex items-start gap-3 py-2">
      <Avatar className="size-7">
        <AvatarFallback className="text-[10px]">
          {initials(item.actorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{item.actorName}</span>{" "}
          {activitySentence(item)}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatRelative(item.createdAt)}
        </p>
      </div>
      {item.undoable && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void undo(item.id)}
        >
          {t("activity.undo")}
        </Button>
      )}
    </div>
  );
}

export function ActivityFeedPage() {
  const activities = useActivityStore((s) => s.activities);
  const setRoute = useAppStore((s) => s.setRoute);

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: activities.filter((a) => dayGroup(a.createdAt) === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("onboarding.back")}
          onClick={() => setRoute({ name: "files" })}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">{t("activity.title")}</h2>
      </header>

      <ScrollArea className="h-full flex-1">
        {activities.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {t("activity.empty")}
          </p>
        ) : (
          <div className="space-y-4 p-4">
            {groups.map(({ group, items }) => (
              <div key={group}>
                <h3 className="text-muted-foreground mb-1 text-xs font-medium">
                  {t(`activity.${GROUP_LABEL[group]}` as "activity.today")}
                </h3>
                <div className="divide-border divide-y">
                  {items.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
