// Üyeler paneli (Dialog): üye listesi (rol/online), Owner rol değiştirir/çıkarır + davet oluşturur.

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { Role } from "@/lib/api/types";
import { initials } from "@/lib/person";
import { roleLabel } from "@/lib/role";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useCollabStore } from "@/stores/collab-store";

const ROLES: Role[] = ["viewer", "editor", "owner"];
const EXPIRY_DAYS = [7, 14, 30];

export function MembersDialog() {
  const open = useAppStore((s) => s.membersOpen);
  const setOpen = useAppStore((s) => s.setMembersOpen);
  const setJoinOpen = useAppStore((s) => s.setJoinOpen);
  const members = useCollabStore((s) => s.members);
  const myRole = useCollabStore((s) => s.myRole);
  const myId = useCollabStore((s) => s.myId);
  const setRole = useCollabStore((s) => s.setRole);
  const remove = useCollabStore((s) => s.remove);

  const isOwner = myRole === "owner";
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [expiryDays, setExpiryDays] = useState(7);
  const [link, setLink] = useState<string | null>(null);

  async function createInvite() {
    const invite = await api.inviteCreate({
      role: inviteRole,
      expiresInDays: expiryDays,
    });
    setLink(invite.link);
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success(t("collab.inviteCopied"));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setLink(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collab.members")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {members.map((m) => {
            const isSelf = m.person.id === myId;
            const editable = isOwner && !isSelf;
            return (
              <div key={m.person.id} className="flex items-center gap-2 py-1">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">
                    {initials(m.person.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.person.fullName}
                    {isSelf && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({t("collab.you")})
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        m.online
                          ? "bg-primary"
                          : "border-muted-foreground/40 border",
                      )}
                    />
                    {m.online ? t("collab.online") : t("collab.offline")}
                  </p>
                </div>

                {editable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="xs" className="gap-1">
                        {roleLabel(m.role)}
                        <ChevronDownIcon className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ROLES.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => void setRole(m.person.id, r)}
                        >
                          {roleLabel(r)}
                          {r === m.role && <CheckIcon className="ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant="secondary">{roleLabel(m.role)}</Badge>
                )}

                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("collab.removeMember")}
                    onClick={() => void remove(m.person.id)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {isOwner && (
          <>
            <Separator />
            <div className="space-y-3">
              <span className="text-sm font-medium">
                {t("collab.inviteTitle")}
              </span>

              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <Button
                    key={r}
                    variant={inviteRole === r ? "secondary" : "outline"}
                    size="xs"
                    onClick={() => {
                      setInviteRole(r);
                      setLink(null);
                    }}
                  >
                    {roleLabel(r)}
                  </Button>
                ))}
                <span className="bg-border mx-1 w-px" />
                {EXPIRY_DAYS.map((d) => (
                  <Button
                    key={d}
                    variant={expiryDays === d ? "secondary" : "outline"}
                    size="xs"
                    onClick={() => {
                      setExpiryDays(d);
                      setLink(null);
                    }}
                  >
                    {d} {t("collab.days")}
                  </Button>
                ))}
              </div>

              {link ? (
                <div className="flex items-center gap-2">
                  <code className="bg-muted truncate rounded px-2 py-1.5 font-mono text-xs">
                    {link}
                  </code>
                  <Button size="sm" onClick={() => void copyLink()}>
                    {t("collab.inviteCopy")}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => void createInvite()}>
                  {t("collab.inviteCreate")}
                </Button>
              )}
              <p className="text-muted-foreground text-xs">
                {t("collab.inviteHint")}
              </p>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-start">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setJoinOpen(true);
            }}
          >
            {t("collab.join")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
