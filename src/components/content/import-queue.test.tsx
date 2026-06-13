import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { startImport } from "@/lib/import";
import { useLibraryStore } from "@/stores/library-store";
import { ImportQueue } from "./import-queue";

describe("ImportQueue", () => {
  it("içe aktarma başlayınca ilerleme kartını gösterir", async () => {
    useLibraryStore.setState({
      activeLibraryId: "lib-1",
      libraries: [],
      loaded: true,
    });
    render(<ImportQueue />);
    await startImport(["/x/yeni.jpg"]);
    await waitFor(() =>
      expect(screen.getByText("İçe aktarılıyor")).toBeInTheDocument(),
    );
    expect(screen.getByText("yeni.jpg")).toBeInTheDocument();
  });
});
