import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { VersionHistory } from "./version-history";

describe("VersionHistory", () => {
  it("dosyanın sürüm zaman çizgisini gösterir", async () => {
    const file = await api.fileGet("f-1");
    render(<VersionHistory file={file} />);
    expect(await screen.findByText("İlk içe aktarma")).toBeInTheDocument();
    expect(screen.getByText("Şu anki")).toBeInTheDocument();
  });
});
