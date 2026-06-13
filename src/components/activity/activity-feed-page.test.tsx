import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useActivityStore } from "@/stores/activity-store";
import { ActivityFeedPage } from "./activity-feed-page";

describe("ActivityFeedPage", () => {
  it("aktiviteleri cümle olarak gösterir", async () => {
    await useActivityStore.getState().load();
    render(<ActivityFeedPage />);
    expect(screen.getByText("Aktivite")).toBeInTheDocument();
    expect(screen.getByText(/etiketi ekledi/)).toBeInTheDocument();
  });
});
