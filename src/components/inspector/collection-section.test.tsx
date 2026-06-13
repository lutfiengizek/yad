import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { useCollectionStore } from "@/stores/collection-store";
import { CollectionSection } from "./collection-section";

describe("CollectionSection", () => {
  it("dosyanın koleksiyonlarını rozet olarak gösterir", async () => {
    await useCollectionStore.getState().load();
    const file = await api.fileGet("f-1");
    render(<CollectionSection file={file} />);
    expect(screen.getByText("Deprem Dosyası")).toBeInTheDocument();
  });
});
