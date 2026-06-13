import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ContentArea } from "@/components/content/content-area";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { TopBar } from "@/components/shell/top-bar";
import { StatusBar } from "@/components/shell/status-bar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useAppStore } from "@/stores/app-store";
import { useBootstrap } from "@/hooks/use-bootstrap";

function App() {
  const inspectorOpen = useAppStore((s) => s.inspectorOpen);
  useBootstrap();

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex h-svh min-h-0 flex-col">
          <TopBar />
          <div className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={70} minSize={40}>
                <ContentArea />
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
    </>
  );
}

export default App;
