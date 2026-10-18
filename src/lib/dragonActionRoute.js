import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder } from "./dragonRepository";
import { dragonPourClient, messagesPonctuels } from "./dragonEngine";
import { modeDebugActif, infosDebug } from "./dragonDebug";
import { revesPourClient } from "./revesRepository";

export async function repondreDragon(dragon, extra = {}) {
  return NextResponse.json({
    ...dragonPourClient(dragon),
    ...(await revesPourClient(dragon)),
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
