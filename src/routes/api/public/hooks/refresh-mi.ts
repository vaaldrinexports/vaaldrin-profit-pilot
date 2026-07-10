import { createFileRoute } from "@tanstack/react-router";
import { refreshMarketIntelligence } from "@/lib/market-pipeline.functions";

// Public hook — called by pg_cron on a schedule.
// No auth needed (bypasses via /api/public/*). Safe: it only writes to
// mi_signals/mi_news/mi_source_health via service-role, no user data.
export const Route = createFileRoute("/api/public/hooks/refresh-mi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const result = await refreshMarketIntelligence({ data: body ?? {} });
          return Response.json({ ok: true, result });
        } catch (e: any) {
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
      GET: async () => Response.json({ hint: "POST to trigger refresh" }),
    },
  },
});
