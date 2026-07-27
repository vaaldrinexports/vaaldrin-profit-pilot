import type { CalculatorState } from "@/lib/calculations";
import { safeJsonParse } from "@/lib/safe-json";

export type AnySettings = Partial<CalculatorState>;

const KEY = "vaaldrin.settings.v1";

export async function loadSettings(): Promise<AnySettings | null> {
  if (typeof window === "undefined") return null;
  try {
    return safeJsonParse<AnySettings>(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export async function saveSettings(settings: AnySettings): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("settings-store write", e);
  }
}
