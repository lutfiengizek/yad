import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ContentArea } from "@/components/content/content-area";
import { PersonDetailPage } from "@/components/person/person-detail-page";
import { ActivityFeedPage } from "@/components/activity/activity-feed-page";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { TopBar } from "@/components/shell/top-bar";
import { StatusBar } from "@/components/shell/status-bar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { CommandPalette } from "@/components/shell/command-palette";
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
                {route.name === "person" ? (
                  <PersonDetailPage personId={route.personId} />
                ) : route.name === "activity" ? (
                  <ActivityFeedPage />
                ) : (
                  <ContentArea />
                )}
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
      <QuickPreview />
      <DropOverlay />
      <ImportQueue />
      <Toaster />
    </>
  );
}

export default App;
