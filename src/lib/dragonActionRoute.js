import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder, appliquerLeconEtSauvegarder } from "./dragonRepository";
import { dragonPourClient, messagesPonctuels } from "./dragonEngine";
import { modeDebugActif, infosDebug } from "./dragonDebug";

export async function repondreDragon(dragon, extra = {}) {
  return NextResponse.json({
    ...dragonPourClient(dragon),
    ...extra,
    ...(modeDebugActif() && { debug: infosDebug(dragon) }),
  });
}

export async function repondreAction(actionName) {
  const { dragon, applique } = await appliquerActionEtSauvegarder(actionName);
  return repondreDragon(dragon, {
    applique,
    toasts: applique ? messagesPonctuels(dragon, actionName) : [],
  });
}

// « Éduquer » passe toujours par une leçon choisie (sport, lecture, musique).
export async function repondreLecon(lecon) {
  const { dragon, applique } = await appliquerLeconEtSauvegarder(lecon);
  return repondreDragon(dragon, {
    applique,
    toasts: applique ? messagesPonctuels(dragon, "eduquer") : [],
  });
}
