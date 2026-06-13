// İlk açılış sihirbazı (3 adım): kimlik → ilk kütüphane → ilk içerik.
// app_init().hasLibrary false ise (kütüphane yok) gösterilir; kapatılamaz.

import { useState } from "react";
import { HardDriveIcon, MonitorIcon, UploadCloudIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useFileStore } from "@/stores/file-store";
import { useLibraryStore } from "@/stores/library-store";

type LocationChoice = "thisPc" | "external";
const STEPS = 3;

export function OnboardingWizard() {
  const needsOnboarding = useLibraryStore(
    (s) => s.loaded && s.libraries.length === 0,
  );
  const createLibrary = useLibraryStore((s) => s.create);

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [libraryName, setLibraryName] = useState("");
  const [location, setLocation] = useState<LocationChoice>("thisPc");
  const [busy, setBusy] = useState(false);

  const open = needsOnboarding && !dismissed;

  async function finish() {
    setBusy(true);
    try {
      if (displayName.trim()) {
        await api.identitySet({
          displayName: displayName.trim(),
          organization: organization.trim() || undefined,
        });
      }
      const name = libraryName.trim() || "Arşivim";
      const rootPath =
        location === "external" ? `/Volumes/${name}` : `~/YAD/${name}`;
      await createLibrary({ name, rootPath, isWorkspaceRoot: true });
      await useFileStore.getState().selectView("all", {});
      setDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  const isLast = step === STEPS - 1;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === 0 && t("onboarding.identityTitle")}
            {step === 1 && t("onboarding.libraryTitle")}
            {step === 2 && t("onboarding.contentTitle")}
          </DialogTitle>
          <DialogDescription>
            {step === 0 && t("onboarding.identityHint")}
            {step === 1 && t("onboarding.welcome")}
            {step === 2 && t("onboarding.contentHint")}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              {t("onboarding.displayName")}
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              {t("onboarding.organization")}
              <Input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              {t("onboarding.libraryName")}
              <Input
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="Arşivim"
                autoFocus
              />
            </label>
            <div className="grid gap-1.5 text-sm">
              {t("onboarding.libraryLocation")}
              <RadioGroup
                value={location}
                onValueChange={(v) => setLocation(v as LocationChoice)}
              >
                <label className="hover:bg-accent/50 flex items-center gap-3 rounded-md border p-3">
                  <RadioGroupItem value="thisPc" />
                  <MonitorIcon className="text-muted-foreground size-4" />
                  {t("onboarding.locationThisPc")}
                </label>
                <label className="hover:bg-accent/50 flex items-center gap-3 rounded-md border p-3">
                  <RadioGroupItem value="external" />
                  <HardDriveIcon className="text-muted-foreground size-4" />
                  {t("onboarding.locationExternal")}
                </label>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="border-input text-muted-foreground flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center text-sm">
            <UploadCloudIcon className="size-8" />
            {t("onboarding.contentHint")}
            <Button variant="outline" size="sm" disabled>
              {t("onboarding.browse")}
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i === step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={busy}
              >
                {t("onboarding.back")}
              </Button>
            )}
            {!isLast ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                {t("onboarding.next")}
              </Button>
            ) : (
              <Button onClick={finish} disabled={busy}>
                {t("onboarding.finish")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
