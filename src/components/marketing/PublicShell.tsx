import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--gold)]" />
            <span className="font-semibold tracking-tight">
              Vaaldrin <span className="text-[var(--gold)]">Profit Pilot</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "text-foreground font-medium" }}
                className="hover:text-foreground transition"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="sm" className="bg-[var(--deep-red)] hover:bg-[var(--deep-red)]/90 text-white">
                Start free trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <div className="font-semibold">Vaaldrin Profit Pilot</div>
            <p className="mt-2 text-muted-foreground">
              Export costing, quotation and profit-control for modern trade teams.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Product</div>
            <ul className="space-y-2">
              <li><Link to="/features" className="hover:text-foreground text-muted-foreground">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground text-muted-foreground">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Company</div>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-foreground text-muted-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground text-muted-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Legal</div>
            <ul className="space-y-2">
              <li><Link to="/legal/terms" className="hover:text-foreground text-muted-foreground">Terms</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-foreground text-muted-foreground">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 text-xs text-muted-foreground flex flex-wrap gap-2 justify-between">
            <span>© {new Date().getFullYear()} Vaaldrin Exports. All rights reserved.</span>
            <span>Made for exporters. Built in India.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
