import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { runRefreshMarketIntelligence } from "@/lib/market-pipeline.functions";

// Public hook — called by pg_cron on a schedule.
// SECURITY: requires shared secret in `Authorization: Bearer <CRON_SECRET>`
// or `x-cron-secret: <CRON_SECRET>` header. Without it, anyone could POST here
// and trigger paid Firecrawl / LLM calls (OWASP API4 — Unrestricted Resource
// Consumption). Timing-safe comparison to prevent secret extraction via timing.
function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const custom = request.headers.get("x-cron-secret") ?? "";
  return Boolean((bearer && timingSafeEq(bearer, expected)) || (custom && timingSafeEq(custom, expected)));
}

export const Route = createFileRoute("/api/public/hooks/refresh-mi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const raw = await request.text();
          // Cap payload size — refuse anything >4KB (hook takes no meaningful input).
          if (raw.length > 4096) return new Response("Payload too large", { status: 413 });
          const body = raw ? JSON.parse(raw) : {};
          const result = await runRefreshMarketIntelligence(body ?? {});
          return Response.json({ ok: true, result });
        } catch (e: any) {
          // Do not leak stack traces to callers.
          console.error("refresh-mi failed", e);
          return Response.json({ ok: false, error: "refresh failed" }, { status: 500 });
        }
      },
      // Removed GET hint handler — it was an unauthenticated info-disclosure surface.
    },
  },
});
