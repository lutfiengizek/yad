import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/providers/theme-provider";
import { useAppStore } from "@/stores/app-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SettingsDialog } from "./settings-dialog";

describe("SettingsDialog", () => {
  it("ayar kategorilerini gösterir", async () => {
    await useSettingsStore.getState().load();
    useAppStore.setState({ settingsOpen: true });
    render(
      <ThemeProvider>
        <SettingsDialog />
      </ThemeProvider>,
    );
    expect(screen.getByText("Ayarlar")).toBeInTheDocument();
    expect(screen.getByText("Görünüm & Tema")).toBeInTheDocument();
    expect(screen.getByText("Izgara yoğunluğu")).toBeInTheDocument();
  });
});
