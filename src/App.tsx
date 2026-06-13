import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { lazy, Suspense } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ContentArea } from "@/components/content/content-area";
import { InspectorPanel } from "@/components/inspector/inspector-panel";

// Route sayfaları yalnızca o route aktifken yüklenir (ayrı chunk'lar).
const PersonDetailPage = lazy(() =>
  import("@/components/person/person-detail-page").then((m) => ({
    default: m.PersonDetailPage,
  })),
);
const ActivityFeedPage = lazy(() =>
  import("@/components/activity/activity-feed-page").then((m) => ({
    default: m.ActivityFeedPage,
  })),
);
const TrashPage = lazy(() =>
  import("@/components/trash/trash-page").then((m) => ({
    default: m.TrashPage,
  })),
);
import { TopBar } from "@/components/shell/top-bar";
import { StatusBar } from "@/components/shell/status-bar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { CommandPalette } from "@/components/shell/command-palette";
import { MembersDialog } from "@/components/collab/members-dialog";
import { JoinDialog } from "@/components/collab/join-dialog";
import { ConflictModal } from "@/components/collab/conflict-modal";
import { ProfileDialog } from "@/components/shell/profile-dialog";
import { SettingsDialog } from "@/components/shell/settings-dialog";
import { ShortcutsDialog } from "@/components/shell/shortcuts-dialog";
import { QuickPreview } from "@/components/content/quick-preview";
import { ImportQueue } from "@/components/content/import-queue";
import { DropOverlay } from "@/components/content/drop-overlay";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/stores/app-store";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

function App() {
  const inspectorOpen = useAppStore((s) => s.inspectorOpen);
  const route = useAppStore((s) => s.route);
  useBootstrap();
  useKeyboardShortcuts();

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex h-svh min-h-0 flex-col">
          <TopBar />
          <div className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={70} minSize={40}>
                <Suspense fallback={null}>
                  {route.name === "person" ? (
                    <PersonDetailPage personId={route.personId} />
                  ) : route.name === "activity" ? (
                    <ActivityFeedPage />
                  ) : route.name === "trash" ? (
                    <TrashPage />
                  ) : (
                    <ContentArea />
                  )}
                </Suspense>
              </ResizablePanel>
              {inspectorOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <InspectorPanel />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
          <StatusBar />
        </SidebarInset>
      </SidebarProvider>
      <OnboardingWizard />
      <CommandPalette />
      <MembersDialog />
      <JoinDialog />
      <ConflictModal />
      <ProfileDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <QuickPreview />
      <DropOverlay />
      <ImportQueue />
      <Toaster />
    </>
  );
}

export default App;
