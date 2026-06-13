import { describe, expect, it } from "vitest";

import { api } from "./index";

describe("api M1 (kütüphane/volume/dosya/import — mock)", () => {
  it("fileList seeded dosyaları döner", async () => {
    const page = await api.fileList({});
    expect(page.total).toBe(8);
    expect(page.items).toHaveLength(8);
  });

  it("fileList kind filtresi uygular (görseller)", async () => {
    const page = await api.fileList({ kinds: ["image"] });
    expect(page.items.every((f) => f.kind === "image")).toBe(true);
    expect(page.total).toBe(3); // f-1, f-2, f-8 (offline dahil)
  });

  it("includeOffline=false çevrimdışı dosyaları eler", async () => {
    const page = await api.fileList({ kinds: ["image"], includeOffline: false });
    expect(page.total).toBe(2);
    expect(page.items.every((f) => f.isAvailable)).toBe(true);
  });

  it("volumeList kütüphaneye göre filtreler", async () => {
    const volumes = await api.volumeList("lib-1");
    expect(volumes).toHaveLength(2);
    expect(volumes.find((v) => v.status === "offline")).toBeTruthy();
  });

  it("libraryCreate kütüphane ve kök volume oluşturur", async () => {
    const before = (await api.libraryList()).length;
    const lib = await api.libraryCreate({
      name: "Yeni Arşiv",
      rootPath: "/tmp/yeni",
    });
    expect(lib.name).toBe("Yeni Arşiv");
    expect((await api.libraryList()).length).toBe(before + 1);
    expect((await api.volumeList(lib.id)).length).toBe(1);
  });

  it("importFiles ilerleme yayar ve dosyayı ekler", async () => {
    const before = (await api.fileList({})).total;
    const done = new Promise<string>((resolve) => {
      const unsub = api.onImportProgress((p) => {
        if (p.phase === "done") {
          unsub();
          resolve(p.currentFile);
        }
      });
    });
    await api.importFiles({
      libraryId: "lib-1",
      paths: ["/x/yeni-foto.jpg"],
      mode: "copy",
    });
    const file = await done;
    expect(file).toBe("yeni-foto.jpg");
    expect((await api.fileList({})).total).toBe(before + 1);
  });
});
