import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAppStore } from "@/stores/app-store";
import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  it("açıkken arama girişini gösterir", () => {
    useAppStore.setState({ commandOpen: true });
    render(<CommandPalette />);
    expect(
      screen.getByPlaceholderText("Dosya, etiket, kişi ara…"),
    ).toBeInTheDocument();
  });
});
