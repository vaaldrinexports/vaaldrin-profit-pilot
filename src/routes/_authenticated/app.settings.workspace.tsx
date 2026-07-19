import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireCurrentOrgId, listMyOrganizations, type Organization } from "@/lib/org-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mail, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type Role = "owner" | "admin" | "member" | "viewer";

interface Member {
  user_id: string;
  role: Role;
  email: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export const Route = createFileRoute("/_authenticated/app/settings/workspace")({
  head: () => ({ meta: [{ title: "Workspace Settings — Vaaldrin" }] }),
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [myUserId, setMyUserId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const myRole: Role | undefined = members.find((m) => m.user_id === myUserId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  async function load() {
    setLoading(true);
    try {
      const [{ data: userRes }, id, orgs] = await Promise.all([
        supabase.auth.getUser(),
        requireCurrentOrgId(),
        listMyOrganizations(),
      ]);
      setMyUserId(userRes.user?.id ?? "");
      setOrgId(id);
      const found = orgs.find((o) => o.id === id) ?? null;
      setOrg(found);

      const [{ data: orgRow }, membersRes, invitesRes] = await Promise.all([
        supabase.from("organizations").select("name,logo_url").eq("id", id).single(),
        supabase.from("org_members").select("user_id,role").eq("org_id", id),
        supabase.from("invitations").select("*").eq("org_id", id).is("accepted_at", null).order("created_at", { ascending: false }),
      ]);
      setName(orgRow?.name ?? "");
      setLogoUrl(orgRow?.logo_url ?? "");

      // Fetch emails for member user_ids via a Postgres function is ideal;
      // absent that, we can only reliably show emails for the current user.
      // Show shortened user_id for the rest — an "invite by email" flow is the primary UX anyway.
      const currentEmail = userRes.user?.email ?? null;
      const memberRows: Member[] = (membersRes.data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role as Role,
        email: m.user_id === userRes.user?.id ? currentEmail : null,
      }));
      setMembers(memberRows);
      setInvites((invitesRes.data ?? []) as Invitation[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveOrg() {
    if (!canManage) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim(), logo_url: logoUrl.trim() || null })
        .eq("id", orgId);
      if (error) throw error;
      toast.success("Workspace updated");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("invitations")
        .insert({ org_id: orgId, email, role: inviteRole, invited_by: userRes.user?.id ?? null })
        .select("*").single();
      if (error) throw error;
      toast.success(`Invite sent to ${email}`);
      setInviteEmail("");
      setInvites((prev) => [data as Invitation, ...prev]);
    } catch (e: any) {
      toast.error(e.code === "23505" ? "This email already has a pending invite" : (e.message || "Failed"));
    } finally { setBusy(false); }
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setInvites((p) => p.filter((i) => i.id !== id));
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  async function changeRole(userId: string, role: Role) {
    if (!canManage) return;
    const { error } = await supabase
      .from("org_members").update({ role }).eq("org_id", orgId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    setMembers((p) => p.map((m) => m.user_id === userId ? { ...m, role } : m));
    toast.success("Role updated");
  }

  async function removeMember(userId: string) {
    if (!canManage) return;
    if (userId === myUserId && !confirm("Leave this workspace?")) return;
    const { error } = await supabase
      .from("org_members").delete().eq("org_id", orgId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    if (userId === myUserId) { window.location.href = "/"; return; }
    setMembers((p) => p.filter((m) => m.user_id !== userId));
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--gold)" }}>Workspace settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {org?.plan?.toUpperCase()} plan · {org?.subscription_status}
          {org?.trial_ends_at && org.subscription_status === "trialing" &&
            ` · trial ends ${new Date(org.trial_ends_at).toLocaleDateString()}`}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Workspace name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
          </div>
          <div>
            <Label>Logo URL (optional)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} disabled={!canManage} placeholder="https://…" />
          </div>
          {canManage && (
            <Button onClick={saveOrg} disabled={busy || !name.trim()}>Save</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.user_id} className="py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{m.email ?? `User ${m.user_id.slice(0, 8)}…`}</div>
                  {m.user_id === myUserId && <span className="text-[10px] text-muted-foreground">You</span>}
                </div>
                {canManage && m.role !== "owner" ? (
                  <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v as Role)}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="uppercase text-[10px]">{m.role}</Badge>
                )}
                {canManage && m.role !== "owner" && (
                  <Button size="icon" variant="ghost" onClick={() => removeMember(m.user_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {m.user_id === myUserId && m.role !== "owner" && (
                  <Button size="sm" variant="ghost" onClick={() => removeMember(m.user_id)}>Leave</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invite people</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email" placeholder="colleague@company.com"
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={sendInvite} disabled={busy || !inviteEmail.trim()}>
                <Mail className="h-4 w-4 mr-2" /> Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share the invite link with them. When they sign up (or sign in) with this email, they're added automatically.
            </p>

            {invites.length > 0 && (
              <div className="divide-y divide-border pt-2">
                <div className="text-[10px] tracking-widest text-muted-foreground py-2">PENDING INVITES</div>
                {invites.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{inv.email}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyInviteLink(inv.token)}>
                      <CopyIcon className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Toaster richColors position="top-right" />
    </div>
  );
}
