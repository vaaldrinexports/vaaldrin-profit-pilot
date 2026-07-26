import { getWebRequest } from "@tanstack/react-start/server";

/**
 * Gates a server function to callers that present the shared CRON_SECRET
 * header. Used to protect endpoints that spend paid third-party API credits
 * (Firecrawl, Lovable AI Gateway) and write to admin-only tables.
 *
 * Throws a Response(401) that TanStack Start surfaces to the caller.
 */
export function requireCronSecret() {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new Response("Server misconfigured: CRON_SECRET not set", { status: 500 });
  }
  const req = getWebRequest();
  const provided = req?.headers.get("x-cron-secret") ?? "";
  if (provided !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
