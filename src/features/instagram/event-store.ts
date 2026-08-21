import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { InstagramAutomationEvent } from "./webhook";

export async function storeInstagramEvents(events: InstagramAutomationEvent[]) {
  if (events.length === 0) return;

  const env = getServerEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from("automation_events")
    .upsert(events, { onConflict: "source,external_event_id", ignoreDuplicates: true });

  if (error) throw new Error(`Unable to store Instagram webhook event: ${error.message}`);
}
