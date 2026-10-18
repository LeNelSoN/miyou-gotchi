import { timingSafeEqual } from "node:crypto";

// Routes appelées par une machine (cron Vercel, homelab), sans session : elles exigent
// `Authorization: Bearer <secret>`. Sans secret configuré, tout appel est refusé.
export function secretValide(request, nomVariable) {
  const secret = process.env[nomVariable];
  if (!secret) return false;
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}
