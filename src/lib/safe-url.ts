/**
 * URL allowlist for any link whose href comes from outside the app
 * (scraped news, Firecrawl source URLs, AI-generated citations).
 *
 * Without this, a hostile source URL such as `javascript:fetch(...)` or
 * `data:text/html,<script>` becomes stored XSS the moment a user clicks the
 * link. React escapes text, but it does NOT sanitize href schemes.
 *
 * Returns a safe absolute http(s) URL, or `undefined` when the value is
 * missing/hostile — callers should render plain text instead of a link.
 */
export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
