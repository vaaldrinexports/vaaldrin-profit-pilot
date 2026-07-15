import { supabase } from "@/integrations/supabase/client";

// Lightweight client-side audit trail. Rows are RLS-scoped to the caller —
// users can only read/write their own audit rows. Best-effort: never throws,
// never blocks the user action.
export type AuditEvent =
  | "quote.saved"
  | "quote.deleted"
  | "quote.loaded"
  | "auth.signed_in"
  | "auth.signed_out"
  | "auth.signup"
  | "auth.failed_login"
  | "market.refresh"
  | "document.downloaded";

export async function recordAudit(
  event: AuditEvent,
  opts: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return; // anonymous events (e.g. failed_login) aren't persisted client-side
    await supabase.from("audit_log").insert({
      user_id: uid,
      event,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      metadata: (opts.metadata ?? {}) as any,
    });
  } catch {
    // audit must never break the user flow
  }
}
