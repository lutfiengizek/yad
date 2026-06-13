import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { useTagStore } from "@/stores/tag-store";
import { TagSection } from "./tag-section";

describe("TagSection", () => {
  it("atanmış etiketleri rozet olarak gösterir", async () => {
    await useTagStore.getState().load();
    const file = await api.fileGet("f-1");
    render(<TagSection file={file} />);
    expect(screen.getByText("Deprem")).toBeInTheDocument();
    expect(screen.getByText("Ankara")).toBeInTheDocument();
    expect(screen.getByText("Acil")).toBeInTheDocument();
  });
});
