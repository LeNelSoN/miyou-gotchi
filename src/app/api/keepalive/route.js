import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { secretValide } from "@/lib/secretRoute";

// Appelée chaque jour par le cron Vercel (vercel.json) : une requête suffit pour que
// Supabase ne mette pas le projet en pause après une semaine sans activité.
export async function GET(request) {
  if (!secretValide(request, "CRON_SECRET")) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { error } = await getSupabaseServerClient().from("dragon").select("id").limit(1);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
