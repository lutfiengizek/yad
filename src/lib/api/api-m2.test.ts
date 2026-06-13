import { describe, expect, it } from "vitest";

import { api } from "./index";

describe("api M2 (organizasyon — mock)", () => {
  it("tagList sayımları dosyalardan hesaplar", async () => {
    const tags = await api.tagList();
    const deprem = tags.find((t) => t.id === "tag-deprem");
    expect(deprem?.count).toBe(2); // f-1, f-2
  });

  it("tagAssign etiketi dosyaya ekler", async () => {
    await api.tagAssign({ fileIds: ["f-4"], tagId: "tag-acil" });
    const file = await api.fileGet("f-4");
    expect(file.tagIds).toContain("tag-acil");
  });

  it("collectionList sayımları hesaplar", async () => {
    const collections = await api.collectionList();
    const deprem = collections.find((c) => c.id === "col-deprem");
    expect(deprem?.count).toBe(2); // f-1, f-2
  });

  it("personList fileCount hesaplar", async () => {
    const persons = await api.personList();
    const ahmet = persons.find((p) => p.id === "person-ahmet");
    expect(ahmet?.fileCount).toBe(2); // f-1, f-3
  });

  it("personLink kişiyi dosyaya bağlar", async () => {
    await api.personLink({ fileIds: ["f-5"], personId: "person-ayse" });
    const file = await api.fileGet("f-5");
    expect(file.personIds).toContain("person-ayse");
  });

  it("fileSetRating derecelendirmeyi günceller", async () => {
    const updated = await api.fileSetRating({ id: "f-6", rating: 4 });
    expect(updated.rating).toBe(4);
  });

  it("noteSet/noteGet not kaydeder ve hasNote işaretler", async () => {
    const json = JSON.stringify({ type: "doc", content: [] });
    await api.noteSet({ fileId: "f-2", contentJson: json });
    const note = await api.noteGet("f-2");
    expect(note?.contentJson).toBe(json);
    const file = await api.fileGet("f-2");
    expect(file.hasNote).toBe(true);
  });

  it("tagSuggest atanmamış etiketleri önerir (≤9)", async () => {
    const suggestions = await api.tagSuggest("f-7");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(9);
  });
});
