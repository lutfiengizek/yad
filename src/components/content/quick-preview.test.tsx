import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAppStore } from "@/stores/app-store";
import { useFileStore } from "@/stores/file-store";
import { QuickPreview } from "./quick-preview";

describe("QuickPreview", () => {
  it("açıkken seçili dosyayı ve konumu gösterir", async () => {
    await useFileStore.getState().selectView("all", {});
    const first = useFileStore.getState().files[0];
    useFileStore.getState().select(first.id);
    useAppStore.setState({ previewOpen: true });
    render(<QuickPreview />);
    expect(screen.getByText(first.name)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 8/)).toBeInTheDocument();
  });
});
