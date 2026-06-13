import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePersonStore } from "@/stores/person-store";
import { PersonDetailPage } from "./person-detail-page";

describe("PersonDetailPage", () => {
  it("kişi profilini (unvan·kurum, e-posta) gösterir", async () => {
    await usePersonStore.getState().load();
    render(<PersonDetailPage personId="person-ahmet" />);
    expect(
      screen.getByText("Genel Yayın Yönetmeni · Gazete X"),
    ).toBeInTheDocument();
    expect(screen.getByText("ahmet@gazetex.example")).toBeInTheDocument();
  });
});
