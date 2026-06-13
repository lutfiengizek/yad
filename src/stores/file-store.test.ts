import { beforeEach, describe, expect, it } from "vitest";

import { useFileStore } from "./file-store";

describe("useFileStore filtreler", () => {
  beforeEach(() => {
    useFileStore.setState({ baseQuery: {}, filters: {}, activeKey: "all" });
  });

  it("tür filtresi taban sorguyla birleşir", async () => {
    await useFileStore.getState().selectView("all", {});
    await useFileStore.getState().setFilters({ kinds: ["image"] });
    const { files } = useFileStore.getState();
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.kind === "image")).toBe(true);
  });

  it("includeOffline=false çevrimdışını eler", async () => {
    await useFileStore.getState().selectView("all", {});
    await useFileStore.getState().setFilters({
      kinds: ["image"],
      includeOffline: false,
    });
    expect(useFileStore.getState().files.every((f) => f.isAvailable)).toBe(true);
  });
});
