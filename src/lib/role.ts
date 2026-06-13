// Rol → görünen etiket (ürün isimleri İngilizce: Owner/Editor/Viewer).

import { t } from "@/i18n";
import type { Role } from "@/lib/api/types";

export function roleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return t("collab.roleOwner");
    case "editor":
      return t("collab.roleEditor");
    default:
      return t("collab.roleViewer");
  }
}
