import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder } from "./dragonRepository";
import { dragonPourClient, messagesPonctuels } from "./dragonEngine";

export async function repondreAction(actionName) {
  const { dragon, applique } = await appliquerActionEtSauvegarder(actionName);
  return NextResponse.json({
    ...dragonPourClient(dragon),
    applique,
    toasts: applique ? messagesPonctuels(dragon, actionName) : [],
  });
}
