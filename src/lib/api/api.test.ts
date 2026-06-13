import { describe, expect, it } from "vitest";
import { api, shouldUseMock } from "./index";
import { defaultSettings } from "./mock-fixtures";

describe("api katmanı (mock mod)", () => {
  it("test ortamında mock seçilir (Tauri yok)", () => {
    expect(shouldUseMock()).toBe(true);
  });

  it("appInit seeded durumda kütüphane ve kimlik bildirir", async () => {
    const result = await api.appInit();
    expect(result).toEqual({ hasLibrary: true, identitySet: true });
  });

  it("settingsGet varsayılan ayarları döner", async () => {
    const settings = await api.settingsGet();
    expect(settings).toEqual(defaultSettings);
  });

  it("settingsSet kısmi yamayı kalıcı uygular", async () => {
    const updated = await api.settingsSet({ theme: "dark" });
    expect(updated.theme).toBe("dark");
    const again = await api.settingsGet();
    expect(again.theme).toBe("dark");
  });

  it("identitySet kimliği günceller ve identityGet döner", async () => {
    const id = await api.identitySet({ displayName: "Ayşe Demir" });
    expect(id.displayName).toBe("Ayşe Demir");
    expect(id.id).toBeTruthy();
    const fetched = await api.identityGet();
    expect(fetched?.displayName).toBe("Ayşe Demir");
  });
});
