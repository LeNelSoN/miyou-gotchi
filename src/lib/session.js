import { createHash, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSION = "miyou-gotchi-session";

// Le navigateur reste connecté un an, renouvelé à chaque visite.
export const OPTIONS_COOKIE_SESSION = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
};

function empreinte(texte) {
  return createHash("sha256").update(`miyou-gotchi:${texte}`).digest();
}

// Le cookie contient une empreinte du mot de passe, jamais le mot de passe lui-même :
// changer `APP_PASSWORD` déconnecte donc tous les navigateurs.
// Renvoie `null` si aucun mot de passe n'est configuré (personne ne peut alors entrer).
export function jetonSession() {
  const motDePasse = process.env.APP_PASSWORD;
  return motDePasse ? empreinte(motDePasse).toString("hex") : null;
}

export function motDePasseValide(saisie) {
  const motDePasse = process.env.APP_PASSWORD;
  if (!motDePasse || typeof saisie !== "string") return false;
  return timingSafeEqual(empreinte(saisie), empreinte(motDePasse));
}

// En mode debug (`DEBUG_MODE`, jamais en production), l'accès est libre sans mot de passe.
export function accesAutorise(jeton) {
  return process.env.DEBUG_MODE === "true" || sessionValide(jeton);
}

function sessionValide(jeton) {
  const attendu = jetonSession();
  if (!attendu || typeof jeton !== "string" || jeton.length !== attendu.length) return false;
  return timingSafeEqual(Buffer.from(jeton), Buffer.from(attendu));
}
