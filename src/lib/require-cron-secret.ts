import { getRequest } from "@tanstack/react-start/server";

/**
 * Gates server functions that spend paid third-party API credits.
 *
 * Allowed callers:
 *  1. Schedulers presenting the shared CRON_SECRET in `x-cron-secret`.
 *  2. The app's own browser UI (same-origin request), rate-limited per IP so
 *     the "Refresh live" buttons work without exposing an unlimited endpoint.
 *
 * Throws a Response(401/429) that TanStack Start surfaces to the caller.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; start: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { count: 1, start: now });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    throw new Response("Too many requests — try again in a minute", { status: 429 });
  }
}

function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export function requireCronSecret() {
  const req = getRequest();
  const expected = process.env.CRON_SECRET;
  const provided = req?.headers.get("x-cron-secret") ?? "";
  if (expected && provided && provided === expected) return;

  if (req && isSameOrigin(req)) {
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    rateLimit(ip);
    return;
  }
  throw new Response("Unauthorized", { status: 401 });
}
