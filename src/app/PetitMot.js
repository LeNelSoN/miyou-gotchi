"use client";

import { useEffect, useState } from "react";

// Clé publique VAPID (base64url) → format attendu par `pushManager.subscribe`.
function cleEnOctets(base64) {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (caractere) => caractere.charCodeAt(0));
}

// État de départ de cet appareil : abonné, abonnable, ou appli à installer d'abord.
async function detecter() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installee = window.matchMedia("(display-mode: standalone)").matches;
  if (ios && !installee) return "aInstaller";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "impossible";
  try {
    const enregistrement = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return (await enregistrement.pushManager.getSubscription()) ? "abonne" : "libre";
  } catch {
    return "impossible";
  }
}

// Abonne l'appareil au petit mot quotidien du dragon. Sur iPhone et iPad, les notifications
// n'existent que pour l'appli ajoutée à l'écran d'accueil : on explique comment faire.
export default function PetitMot() {
  const [etat, setEtat] = useState("inconnu");

  useEffect(() => {
    detecter().then(setEtat);
  }, []);

  async function abonner() {
    setEtat("enCours");
    try {
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleEnOctets(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/notifications", { method: "POST", body: JSON.stringify(abonnement) });
      setEtat(res.ok ? "abonne" : "libre");
    } catch {
      // Permission refusée : le bouton reste disponible pour réessayer.
      setEtat(Notification.permission === "denied" ? "refuse" : "libre");
    }
  }

  async function desabonner() {
    setEtat("enCours");
    const enregistrement = await navigator.serviceWorker.ready;
    const abonnement = await enregistrement.pushManager.getSubscription();
    if (abonnement) {
      await fetch("/api/notifications", { method: "DELETE", body: JSON.stringify({ endpoint: abonnement.endpoint }) });
      await abonnement.unsubscribe();
    }
    setEtat("libre");
  }

  const classe = "font-pixel text-xs text-amber-100/80 underline-offset-4 hover:underline disabled:opacity-50";
  if (etat === "aInstaller") {
    return (
      <p className="font-pixel text-xs text-amber-100/80">
        🔔 Pour recevoir un petit mot chaque jour : bouton Partager, puis « Sur l&apos;écran d&apos;accueil ».
      </p>
    );
  }
  if (etat === "refuse") {
    return <p className="font-pixel text-xs text-amber-100/80">🔕 Les notifications sont bloquées sur cet appareil.</p>;
  }
  if (etat === "abonne") {
    return (
      <button onClick={desabonner} className={classe}>
        🔔 Petit mot du jour activé · arrêter
      </button>
    );
  }
  if (etat === "libre" || etat === "enCours") {
    return (
      <button onClick={abonner} disabled={etat === "enCours"} className={classe}>
        🔔 Recevoir un petit mot chaque jour
      </button>
    );
  }
  return null;
}
