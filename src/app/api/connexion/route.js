import { NextResponse } from "next/server";
import { COOKIE_SESSION, OPTIONS_COOKIE_SESSION, jetonSession, motDePasseValide } from "@/lib/session";

// Corps : `{ "password": "..." }`.
export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!motDePasseValide(password)) {
    return NextResponse.json({ erreur: "Mot de passe incorrect." }, { status: 401 });
  }

  const reponse = NextResponse.json({ connecte: true });
  reponse.cookies.set(COOKIE_SESSION, jetonSession(), OPTIONS_COOKIE_SESSION);
  return reponse;
}
