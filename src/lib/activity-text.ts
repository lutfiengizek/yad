// Aktivite cümlesi: i18n şablonunu objectName/params ile doldurur.
// Şablon yer tutucuları: {object} + ActivityItem.params anahtarları (ör. {tag}).

import { t } from "@/i18n";
import type { ActivityItem } from "@/lib/api/types";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export function activitySentence(a: ActivityItem): string {
  const template = t(`activity.${a.action}` as "activity.file.add");
  return interpolate(template, { object: a.objectName, ...(a.params ?? {}) });
}

export type DayGroup = "today" | "yesterday" | "earlier";

export function dayGroup(iso: string): DayGroup {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const at = new Date(iso).getTime();
  if (at >= startOfToday) return "today";
  if (at >= startOfToday - 86_400_000) return "yesterday";
  return "earlier";
}
