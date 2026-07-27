/**
 * Prototype-pollution-safe JSON parse for anything read back out of
 * localStorage. A tampered/XSS-planted payload containing "__proto__",
 * "constructor" or "prototype" keys is stripped before the object is ever
 * spread into application state.
 */
const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (BANNED_KEYS.has(k)) continue;
      out[k] = scrub(v);
    }
    return Object.assign({}, out);
  }
  return value;
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return scrub(JSON.parse(raw)) as T;
  } catch {
    return null;
  }
}
