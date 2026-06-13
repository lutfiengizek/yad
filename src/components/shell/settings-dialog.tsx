// Ayarlar diyaloğu: dağınık ayarları tek yerde toplar (tema/dil/görünüm/yoğunluk/rozet/çöp/güncelleme).

import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/api/types";
import { useAppStore } from "@/stores/app-store";
import { useSettingsStore } from "@/stores/settings-store";

type Theme = Settings["theme"];
type View = Settings["defaultView"];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

const BADGE_KEYS: (keyof Settings["badges"])[] = [
  "tag",
  "note",
  "sync",
  "person",
];
const RETENTION = [7, 14, 30, 60];

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const { setTheme } = useTheme();

  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    available: boolean;
    version?: string;
  } | null>(null);

  if (!settings) return null;

  function chooseTheme(theme: Theme) {
    setTheme(theme);
    void update({ theme });
  }
  function chooseView(view: View) {
    setViewMode(view);
    void update({ defaultView: view });
  }
  function toggleBadge(key: keyof Settings["badges"]) {
    void update({
      badges: { ...settings!.badges, [key]: !settings!.badges[key] },
    });
  }
  async function checkUpdate() {
    setChecking(true);
    try {
      setUpdateResult(await api.updateCheck());
    } finally {
      setChecking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance">
          <TabsList className="w-full">
            <TabsTrigger value="appearance">
              {t("settings.appearance")}
            </TabsTrigger>
            <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
            <TabsTrigger value="update">{t("settings.update")}</TabsTrigger>
            <TabsTrigger value="about">{t("settings.about")}</TabsTrigger>
          </TabsList>

          {/* GÖRÜNÜM */}
          <TabsContent value="appearance" className="pt-2">
            <Row label={t("settings.theme")}>
              {(["light", "dark", "system"] as Theme[]).map((th) => (
                <Button
                  key={th}
                  variant={settings.theme === th ? "secondary" : "outline"}
                  size="xs"
                  onClick={() => chooseTheme(th)}
                >
                  {t(`topbar.theme${th === "light" ? "Light" : th === "dark" ? "Dark" : "System"}` as "topbar.themeLight")}
                </Button>
              ))}
            </Row>
            <Row label={t("settings.language")}>
              <Button variant="secondary" size="xs">
                {t("settings.languageTr")}
              </Button>
              <Button variant="outline" size="xs" disabled>
                {t("settings.languageEn")} · {t("settings.comingSoon")}
              </Button>
            </Row>
            <Row label={t("settings.defaultView")}>
              {(["grid", "list"] as View[]).map((v) => (
                <Button
                  key={v}
                  variant={settings.defaultView === v ? "secondary" : "outline"}
                  size="xs"
                  onClick={() => chooseView(v)}
                >
                  {v === "grid" ? t("grid.viewGrid") : t("grid.viewList")}
                </Button>
              ))}
            </Row>
            <div className="py-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm">{t("settings.density")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {settings.gridDensity}/5
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[settings.gridDensity]}
                onValueChange={(v) => void update({ gridDensity: v[0] })}
              />
            </div>
            <div className="py-1.5">
              <span className="text-sm">{t("settings.badges")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {BADGE_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={settings.badges[key]}
                      onCheckedChange={() => toggleBadge(key)}
                    />
                    {t(`settings.badge${key.charAt(0).toUpperCase() + key.slice(1)}` as "settings.badgeTag")}
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* GENEL */}
          <TabsContent value="general" className="pt-2">
            <Row label={t("settings.trashRetention")}>
              {RETENTION.map((d) => (
                <Button
                  key={d}
                  variant={
                    settings.trashRetentionDays === d ? "secondary" : "outline"
                  }
                  size="xs"
                  onClick={() => void update({ trashRetentionDays: d })}
                >
                  {d} {t("collab.days")}
                </Button>
              ))}
            </Row>
            <label className="flex items-center justify-between py-1.5">
              <span className="text-sm">{t("settings.autoUpdate")}</span>
              <Checkbox
                checked={settings.autoUpdate}
                onCheckedChange={(c) =>
                  void update({ autoUpdate: c === true })
                }
              />
            </label>
          </TabsContent>

          {/* GÜNCELLEME */}
          <TabsContent value="update" className="space-y-3 pt-2">
            <Row label={t("app.name")}>
              <span className="text-muted-foreground text-sm tabular-nums">
                {t("app.version")}
              </span>
            </Row>
            <Button
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={() => void checkUpdate()}
            >
              {t("settings.checkUpdate")}
            </Button>
            {updateResult &&
              (updateResult.available ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    {t("settings.updateAvailable")} {updateResult.version}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => void api.updateInstall()}
                  >
                    {t("settings.install")}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("settings.upToDate")}
                </p>
              ))}
          </TabsContent>

          {/* HAKKINDA */}
          <TabsContent value="about" className="space-y-2 pt-2">
            <p className="text-sm font-medium">
              {t("app.name")}{" "}
              <span className="text-muted-foreground font-normal tabular-nums">
                {t("app.version")}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">
              {t("settings.aboutBlurb")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("settings.license")}
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
