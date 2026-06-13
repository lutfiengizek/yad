import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useVolumeStore } from "@/stores/volume-store";
import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  it("aktif kütüphanenin volume'larını listeler", async () => {
    await useVolumeStore.getState().load("lib-1");
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );
    expect(screen.getByText("Yerel Arşiv")).toBeInTheDocument();
    expect(screen.getByText("Saha USB")).toBeInTheDocument();
    expect(screen.getByText("Tüm Dosyalar")).toBeInTheDocument();
  });
});
