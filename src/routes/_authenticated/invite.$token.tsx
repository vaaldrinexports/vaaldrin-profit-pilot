import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentOrgId } from "@/lib/org-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invitation — Vaaldrin" }, { name: "robots", content: "noindex" }] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<any | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const email = userRes.user?.email?.toLowerCase();
        const { data: inv, error: e1 } = await supabase
          .from("invitations").select("*").eq("token", token).maybeSingle();
        if (e1) throw e1;
        if (!inv) { setError("Invitation not found or already used."); return; }
        if (inv.accepted_at) { setError("This invitation has already been accepted."); return; }
        if (new Date(inv.expires_at) < new Date()) { setError("This invitation has expired."); return; }
        if (email && email !== inv.email.toLowerCase()) {
          setError(`This invitation is for ${inv.email}. You are signed in as ${email}.`);
          return;
        }
        setInvite(inv);
        const { data: o } = await supabase
          .from("organizations").select("id,name").eq("id", inv.org_id).maybeSingle();
        setOrg(o as any);
      } catch (e: any) {
        setError(e.message || "Failed to load invitation");
      } finally { setLoading(false); }
    })();
  }, [token]);

  async function accept() {
    if (!invite) return;
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error: memErr } = await supabase
        .from("org_members").insert({ org_id: invite.org_id, user_id: userId, role: invite.role });
      if (memErr && memErr.code !== "23505") throw memErr;
      const { error: accErr } = await supabase
        .from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
      if (accErr) throw accErr;
      setCurrentOrgId(invite.org_id);
      toast.success(`Joined ${org?.name}`);
      navigate({ to: "/app" });
      setTimeout(() => window.location.reload(), 200);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Workspace invitation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {invite && org && (
            <>
              <p className="text-sm">
                You've been invited to join <strong>{org.name}</strong> as{" "}
                <strong className="uppercase">{invite.role}</strong>.
              </p>
              <div className="flex gap-2">
                <Button onClick={accept} disabled={busy} className="flex-1">Accept invitation</Button>
                <Button variant="ghost" onClick={() => navigate({ to: "/app" })}>Decline</Button>
              </div>
            </>
          )}
          {error && (
            <Button variant="outline" onClick={() => navigate({ to: "/app" })} className="w-full">
              Go to dashboard
            </Button>
          )}
        </CardContent>
      </Card>
      <Toaster richColors position="top-right" />
    </div>
  );
}
