import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyOrganizations,
  resolveCurrentOrgId,
  setCurrentOrgId,
  type Organization,
} from "@/lib/org-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "workspace";
}

export default function WorkspaceSwitcher() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentId, setCurrent] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const list = await listMyOrganizations();
    setOrgs(list);
    const cur = await resolveCurrentOrgId();
    setCurrent(cur);
  }

  useEffect(() => { void refresh(); }, []);

  const current = orgs.find((o) => o.id === currentId);

  function switchTo(id: string) {
    setCurrentOrgId(id);
    // Full reload so every cached fetch re-reads under the new org context.
    window.location.reload();
  }

  async function createOrg() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not signed in");
      let slug = slugify(newName);
      // Ensure unique
      for (let i = 0; i < 6; i++) {
        const { data: exists } = await supabase
          .from("organizations").select("id").eq("slug", slug).maybeSingle();
        if (!exists) break;
        slug = `${slugify(newName)}-${Math.floor(Math.random() * 900 + 100)}`;
      }
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name: newName.trim(), slug, created_by: user.id })
        .select("id").single();
      if (error) throw error;
      const { error: memErr } = await supabase
        .from("org_members").insert({ org_id: org.id, user_id: user.id, role: "owner" });
      if (memErr) throw memErr;
      toast.success("Workspace created");
      setCurrentOrgId(org.id);
      setCreating(false);
      setNewName("");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to create workspace");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-9 text-xs font-medium"
          >
            <span className="truncate text-left">
              {current?.name || "Select workspace"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[10px] tracking-widest text-muted-foreground">
            WORKSPACES
          </DropdownMenuLabel>
          {orgs.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => o.id !== currentId && switchTo(o.id)}
              className="flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm">{o.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {o.role} · {o.plan}
                </div>
              </div>
              {o.id === currentId && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" /> New workspace
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/app/settings/workspace">
              <Settings2 className="h-4 w-4 mr-2" /> Workspace settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              placeholder="Acme Exports Pvt Ltd"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Starts on the Free plan with a 14-day Pro trial.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createOrg} disabled={busy || !newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
