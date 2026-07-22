import { useEffect, useState } from "react";
import { getCurrentOrgIdCached, resolveCurrentOrgId } from "@/lib/org-store";

export function useCurrentOrgId(): string | null {
  const [orgId, setOrgId] = useState<string | null>(() => getCurrentOrgIdCached());
  useEffect(() => {
    let alive = true;
    if (!orgId) {
      resolveCurrentOrgId().then((id) => { if (alive) setOrgId(id); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [orgId]);
  return orgId;
}
