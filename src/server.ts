import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Enterprise security headers applied to every response.
// - HSTS: force HTTPS for 2 years including subdomains (safe: app is HTTPS-only in prod).
// - X-Content-Type-Options: block MIME sniffing (XSS via mistyped assets).
// - X-Frame-Options + frame-ancestors: block clickjacking.
// - Referrer-Policy: never leak full URL / query params cross-origin.
// - Permissions-Policy: deny sensitive browser APIs we do not use.
// - CSP: report-only during rollout to avoid breaking Vite HMR / inline SSR
//   theme bootstrap; upgrade to enforcing once monitored.
function applySecurityHeaders(response: Response): Response {
  const h = new Headers(response.headers);
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  h.set("X-DNS-Prefetch-Control", "off");
  // CSP now ENFORCING (Phase 7). 'unsafe-inline' on script-src stays for the
  // SSR theme bootstrap; harden further with a nonce once every inline script
  // is inventoried. frame-ancestors 'none' + X-Frame-Options: DENY block
  // clickjacking regardless. connect-src includes wss: for Vite HMR in dev.
  if (!h.has("Content-Security-Policy") && !h.has("Content-Security-Policy-Report-Only")) {
    h.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "object-src 'none'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "script-src 'self' 'unsafe-inline' https://cdn.paddle.com https://*.paddle.com",
        "connect-src 'self' https: wss:",
        "frame-src 'self' https://*.paddle.com https://buy.paddle.com https://checkout.paddle.com https://sandbox-buy.paddle.com https://sandbox-checkout.paddle.com",
        "child-src 'self' https://*.paddle.com",
      ].join("; "),

    );
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
