import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFileStore } from "@/stores/file-store";
import { ContentArea } from "./content-area";

describe("ContentArea", () => {
  it("dolu durumda dosyaları ızgarada listeler", async () => {
    await useFileStore.getState().selectView("all", {});
    render(<ContentArea />);
    expect(screen.getByText("deprem-saha-01.jpg")).toBeInTheDocument();
    expect(screen.getByText(/8\s*öğe/)).toBeInTheDocument();
  });

  it("boş durumda boş mesajı ve dosya ekle düğmesini gösterir", () => {
    useFileStore.setState({ files: [], total: 0, loading: false });
    render(<ContentArea />);
    expect(screen.getByText(/Arşivin henüz boş/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Dosya ekle/ }),
    ).toBeInTheDocument();
  });
});
