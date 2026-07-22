import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/entitlements";

interface PlanLockProps {
  requiredPlan: Exclude<Plan, "free">;
  featureName: string;
  description?: string;
  children: React.ReactNode;
  /** Show locked (overlay + blur) when true. */
  locked: boolean;
}

export function PlanLock({ requiredPlan, featureName, description, children, locked }: PlanLockProps) {
  if (!locked) return <>{children}</>;
  const planLabel = requiredPlan === "pro" ? "Pro" : "Business";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/30">
      <div aria-hidden className="pointer-events-none select-none blur-[3px] opacity-60 max-h-[420px] overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm px-6">
        <div className="max-w-md text-center rounded-xl border border-gold/40 bg-card/95 p-6 shadow-xl">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gold/15 text-gold mb-3">
            <Lock className="h-5 w-5" />
          </div>
          <div className="text-xs uppercase tracking-wide text-gold font-semibold">{planLabel} plan</div>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{featureName} is locked</h3>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <Link to="/pricing" className="inline-block mt-4">
            <Button className="bg-[#A61D24] hover:bg-[#8a181e] text-white">
              <Sparkles className="h-4 w-4 mr-2" /> Upgrade to {planLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
