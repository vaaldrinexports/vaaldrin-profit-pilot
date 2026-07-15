import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Vaaldrin Exports" },
      { name: "description", content: "Sign in to the Vaaldrin Exports Profit Pilot workspace." },
      { property: "og:title", content: "Sign in — Vaaldrin Exports" },
      { property: "og:description", content: "Sign in to the Vaaldrin Exports Profit Pilot workspace." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vaaldrin-profit-pilot.lovable.app/auth" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://vaaldrin-profit-pilot.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then sign in.");
        setMode("signin");
        // Audit: signup attempt (row will be created when the user first signs in)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { recordAudit } = await import("@/lib/audit-log");
        void recordAudit("auth.signed_in", { metadata: { method: "password" } });
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      const { recordAudit } = await import("@/lib/audit-log");
      void recordAudit("auth.signed_in", { metadata: { method: "google" } });
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--gold, #C9A227)" }}>VAALDRIN EXPORTS</h1>
          <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to continue" : "Create your account"}</p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> or <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={onEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={10} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">Minimum 10 characters. Compromised passwords are rejected.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </Card>
      <Toaster richColors position="top-right" />
    </div>
  );
}
