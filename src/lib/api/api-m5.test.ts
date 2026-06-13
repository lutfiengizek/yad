import { describe, expect, it } from "vitest";

import { api } from "./index";

describe("api M5 (işbirliği — mock)", () => {
  it("memberList üyeleri döner; self owner", async () => {
    const members = await api.memberList();
    expect(members.find((m) => m.person.id === "person-self")?.role).toBe(
      "owner",
    );
  });

  it("inviteCreate link ve son kullanma tarihi döner", async () => {
    const invite = await api.inviteCreate({ role: "editor", expiresInDays: 7 });
    expect(invite.link).toContain("yad-invite:");
    expect(invite.expiresAt).toBeTruthy();
  });

  it("syncStatus durum döner", async () => {
    const status = await api.syncStatus();
    expect(status.state).toBe("idle");
    expect(status.peersOnline).toBeGreaterThanOrEqual(0);
  });

  it("conflictResolve çatışmayı çözer ve rating uygular (theirs)", async () => {
    expect((await api.conflictList()).length).toBeGreaterThan(0);
    await api.conflictResolve({ conflictId: "conf-1", choice: "theirs" });
    expect((await api.conflictList()).some((c) => c.id === "conf-1")).toBe(
      false,
    );
    expect((await api.fileGet("f-2")).rating).toBe(3);
  });
});
