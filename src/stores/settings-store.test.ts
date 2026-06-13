import { beforeEach, describe, expect, it } from "vitest";

import { useSettingsStore } from "./settings-store";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: null, loaded: false });
  });

  it("load mock ayarlarını getirir", async () => {
    await useSettingsStore.getState().load();
    const { settings, loaded } = useSettingsStore.getState();
    expect(loaded).toBe(true);
    expect(settings?.locale).toBe("tr");
  });

  it("update ayarı değiştirir ve kalıcı yansır", async () => {
    await useSettingsStore.getState().load();
    await useSettingsStore.getState().update({ defaultView: "list" });
    expect(useSettingsStore.getState().settings?.defaultView).toBe("list");
  });
});
