import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let client;

// Node < 22 n'a pas de WebSocket global natif, ce que supabase-js exige au
// démarrage même sans utiliser Realtime — on lui fournit `ws` explicitement.
export function getSupabaseServerClient() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      realtime: { transport: WebSocket },
    });
  }
  return client;
}
