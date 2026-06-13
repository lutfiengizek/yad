import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLibraryStore } from "@/stores/library-store";
import { OnboardingWizard } from "./onboarding-wizard";

describe("OnboardingWizard", () => {
  it("kütüphane yokken kimlik adımıyla açılır", () => {
    useLibraryStore.setState({
      libraries: [],
      activeLibraryId: null,
      loaded: true,
    });
    render(<OnboardingWizard />);
    expect(screen.getByText("Kimliğin")).toBeInTheDocument();
    expect(screen.getByText("İleri")).toBeInTheDocument();
  });

  it("kütüphane varken görünmez", () => {
    useLibraryStore.setState({
      libraries: [
        {
          id: "lib-1",
          name: "Arşiv",
          rootPath: "/x",
          isWorkspaceRoot: true,
          createdAt: "2026-06-13T12:00:00.000Z",
        },
      ],
      activeLibraryId: "lib-1",
      loaded: true,
    });
    render(<OnboardingWizard />);
    expect(screen.queryByText("Kimliğin")).not.toBeInTheDocument();
  });
});
