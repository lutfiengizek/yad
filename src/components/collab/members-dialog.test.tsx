import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";
import { MembersDialog } from "./members-dialog";

describe("MembersDialog", () => {
  it("üyeleri listeler", async () => {
    await useCollabStore.getState().load();
    useAppStore.setState({ membersOpen: true });
    render(<MembersDialog />);
    expect(screen.getByText("Ali Yılmaz")).toBeInTheDocument();
    expect(screen.getByText("Ayşe Demir")).toBeInTheDocument();
  });
});
