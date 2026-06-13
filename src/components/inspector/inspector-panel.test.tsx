import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFileStore } from "@/stores/file-store";
import { InspectorPanel } from "./inspector-panel";

describe("InspectorPanel", () => {
  it("dosya seçili değilken boş mesaj gösterir", () => {
    useFileStore.setState({ files: [], selectedId: null });
    render(<InspectorPanel />);
    expect(screen.getByText(/bir dosya seç/)).toBeInTheDocument();
  });

  it("seçili dosyanın künyesini gösterir", async () => {
    await useFileStore.getState().selectView("all", {});
    const first = useFileStore.getState().files[0];
    useFileStore.getState().select(first.id);
    render(<InspectorPanel />);
    expect(screen.getByText(first.name)).toBeInTheDocument();
    expect(screen.getByText("İçerik hash'i")).toBeInTheDocument();
  });
});
