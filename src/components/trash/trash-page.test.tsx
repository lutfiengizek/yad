import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { TrashPage } from "./trash-page";

describe("TrashPage", () => {
  it("çöpteki dosyayı listeler", async () => {
    await api.fileMoveToTrash({ ids: ["f-7"] });
    render(<TrashPage />);
    expect(screen.getByText("Çöp Kutusu")).toBeInTheDocument();
    expect(await screen.findByText("arsiv.zip")).toBeInTheDocument();
  });
});
