// Tüm ekranlarda tutarlı boş durum: ikon + mesaj + (opsiyonel) eylem.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <Icon className="text-muted-foreground/60 size-10" />
      <p className="text-muted-foreground max-w-xs text-sm">{message}</p>
      {action}
    </div>
  );
}
