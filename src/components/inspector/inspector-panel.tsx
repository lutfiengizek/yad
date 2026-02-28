import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { t } from "@/i18n";

export function InspectorPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium">{t("inspector.preview")}</h3>
          <div className="mt-2 flex h-32 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              {t("content.emptyState")}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium">{t("inspector.tags")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">-</p>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium">{t("inspector.persons")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">-</p>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium">{t("inspector.notes")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">-</p>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium">{t("inspector.metadata")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">-</p>
        </div>
      </div>
    </ScrollArea>
  );
}
