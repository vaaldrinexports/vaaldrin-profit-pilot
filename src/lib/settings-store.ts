import { supabase } from "@/integrations/supabase/client";
import type { CalculatorState } from "@/lib/calculations";

export type AnySettings = Partial<CalculatorState>;

export async function loadSettings(): Promise<AnySettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("settings")
    .maybeSingle();
  if (error) {
    console.error("loadSettings", error);
    return null;
  }
  return (data?.settings as AnySettings) ?? null;
}

export async function saveSettings(settings: AnySettings): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("app_settings")
    .upsert({ user_id: user.id, settings: settings as any }, { onConflict: "user_id" });
  if (error) {
    console.error("saveSettings", error);
    throw error;
  }
}
