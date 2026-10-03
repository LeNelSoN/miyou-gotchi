import { NextResponse } from "next/server";
import { COOKIE_SESSION, OPTIONS_COOKIE_SESSION, accesAutorise } from "@/lib/session";

const CHEMINS_CONNEXION = ["/connexion", "/api/connexion"];

// Tout le site est derrière le mot de passe, API et illustrations comprises (sauf en mode debug).
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const jeton = request.cookies.get(COOKIE_SESSION)?.value;
  const connecte = accesAutorise(jeton);

  if (CHEMINS_CONNEXION.includes(pathname)) {
    return connecte && pathname === "/connexion"
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!connecte) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ erreur: "Connexion requise." }, { status: 401 })
      : NextResponse.redirect(new URL("/connexion", request.url));
  }

  const reponse = NextResponse.next();
  // Chaque visite de la page repousse l'expiration de la session.
  if (jeton && !pathname.startsWith("/api/")) reponse.cookies.set(COOKIE_SESSION, jeton, OPTIONS_COOKIE_SESSION);
  return reponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
