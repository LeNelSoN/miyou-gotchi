import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder } from "./dragonRepository";
import { dragonPourClient, messagesPonctuels } from "./dragonEngine";
import { modeDebugActif, infosDebug } from "./dragonDebug";

export function repondreDragon(dragon, extra = {}) {
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
