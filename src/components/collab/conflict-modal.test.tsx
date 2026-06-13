import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";
import { ConflictModal } from "./conflict-modal";

describe("ConflictModal", () => {
  it("çatışmayı yan yana gösterir", async () => {
    await useCollabStore.getState().load();
    useAppStore.setState({ conflictOpen: true });
    render(<ConflictModal />);
    expect(screen.getByText("Çatışma çözümü")).toBeInTheDocument();
    expect(screen.getByText("Senin sürümün")).toBeInTheDocument();
  });
});
