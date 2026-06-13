// Görüntüleme biçimlendiricileri (boyut, tarih). UI'da ham değer gösterilmez.

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

// Göreli zaman (Türkçe): "az önce", "3 saat önce", "dün", "5 gün önce".
export function formatRelative(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "az önce";
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.round(hr / 24);
  if (day === 1) return "dün";
  if (day < 30) return `${day} gün önce`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon} ay önce`;
  return `${Math.round(mon / 12)} yıl önce`;
}
