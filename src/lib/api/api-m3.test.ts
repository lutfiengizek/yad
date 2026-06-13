import { describe, expect, it } from "vitest";

import { api } from "./index";

describe("api M3 (arama — mock)", () => {
  it("searchGlobal çok-tipli sonuç döner", async () => {
    const r = await api.searchGlobal("deprem");
    expect(r.files.length).toBeGreaterThan(0);
    expect(r.tags.some((t) => t.name === "Deprem")).toBe(true);
  });

  it("search, file_list ile aynı filtreyi uygular", async () => {
    const page = await api.search({ kinds: ["image"] });
    expect(page.items.every((f) => f.kind === "image")).toBe(true);
  });

  it("boş metin boş sonuç döner", async () => {
    const r = await api.searchGlobal("   ");
    expect(r.files).toHaveLength(0);
    expect(r.tags).toHaveLength(0);
  });
});
