// Yerel dosya/thumbnail görseli: Tauri asset protokolü (convertFileSrc) ile gösterilir.
// Mock/tarayıcı modunda protokol yoktur; yol olduğu gibi döndürülür.

import { convertFileSrc } from "@tauri-apps/api/core";

import { shouldUseMock } from "@/lib/api";

export function assetUrl(path: string): string {
  if (shouldUseMock()) return path;
  return convertFileSrc(path);
}
