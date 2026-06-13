import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { CompareView } from "./compare-view";

describe("CompareView", () => {
  it("seçili öğeden başlayarak dosyaları yan yana gösterir", async () => {
    const page = await api.fileList({});
    render(
      <CompareView
        files={page.items}
        selectedId={page.items[0].id}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(page.items[0].name)).toBeInTheDocument();
    expect(screen.getByText(page.items[1].name)).toBeInTheDocument();
  });
});
