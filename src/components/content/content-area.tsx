import { t } from "@/i18n";

export function ContentArea() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">{t("content.emptyState")}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {t("content.dragDropHint")}
        </p>
      </div>
    </div>
  );
}
