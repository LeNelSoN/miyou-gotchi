import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Appelée chaque jour par le cron Vercel (vercel.json) : une requête suffit pour que
// Supabase ne mette pas le projet en pause après une semaine sans activité.
// Vercel envoie `CRON_SECRET` en en-tête ; sans ce secret, la route refuse tout appel.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { error } = await getSupabaseServerClient().from("dragon").select("id").limit(1);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
