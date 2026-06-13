import { describe, expect, it } from "vitest";

import { api } from "./index";

describe("api M4 (sürüm/aktivite/çöp — mock)", () => {
  it("versionList sürümleri döner, biri current", async () => {
    const versions = await api.versionList("f-1");
    expect(versions.length).toBeGreaterThanOrEqual(3);
    expect(versions.filter((v) => v.isCurrent).length).toBe(1);
  });

  it("versionRestore yeni current sürüm ekler", async () => {
    const before = (await api.versionList("f-1")).length;
    await api.versionRestore({ fileId: "f-1", versionId: "ver-1a" });
    const after = await api.versionList("f-1");
    expect(after.length).toBe(before + 1);
    expect(after.find((v) => v.isCurrent)?.id).not.toBe("ver-1c");
  });

  it("activityList tarihe göre azalan sıralanır", async () => {
    const acts = await api.activityList();
    expect(acts.length).toBeGreaterThan(0);
    for (let i = 1; i < acts.length; i += 1) {
      expect(acts[i - 1].createdAt >= acts[i].createdAt).toBe(true);
    }
  });

  it("çöp akışı: taşı → listede görünür, dosya listesinden çıkar → geri al", async () => {
    await api.fileMoveToTrash({ ids: ["f-7"] });
    expect((await api.trashList()).some((f) => f.id === "f-7")).toBe(true);
    expect((await api.fileList({})).items.some((f) => f.id === "f-7")).toBe(
      false,
    );
    await api.fileRestore({ ids: ["f-7"] });
    expect((await api.trashList()).some((f) => f.id === "f-7")).toBe(false);
  });

  it("file.trash aktivitesi undoable ve geri alınabilir", async () => {
    await api.fileMoveToTrash({ ids: ["f-6"] });
    const acts = await api.activityList({ objectType: "file" });
    const trashAct = acts.find(
      (a) => a.action === "file.trash" && a.objectId === "f-6",
    );
    expect(trashAct?.undoable).toBe(true);
    await api.activityUndo(trashAct!.id);
    expect((await api.trashList()).some((f) => f.id === "f-6")).toBe(false);
  });
});
