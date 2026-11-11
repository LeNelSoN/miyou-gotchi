import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder, appliquerLeconEtSauvegarder, enGreve, jouerChoixEtSauvegarder } from "./dragonRepository";
import { dragonPourClient, messagesPonctuels } from "./dragonEngine";
import { modeDebugActif, infosDebug } from "./dragonDebug";
import { quetePourClient } from "./quete";

export async function repondreDragon(dragon, extra = {}) {
  return NextResponse.json({
    ...dragonPourClient(dragon),
    greve: enGreve(),
    quete: quetePourClient(dragon),
    ...extra,
    ...(modeDebugActif() && { debug: infosDebug(dragon) }),
  });
}

// Un soin donné sans besoin (`exces`, ex : trop mangé) remplace le message habituel par le sien.
export async function repondreAction(actionName) {
  const { dragon, applique, exces = [] } = await appliquerActionEtSauvegarder(actionName);
  return repondreDragon(dragon, {
    applique,
    exces: exces.length > 0,
    toasts: !applique ? [] : exces.length ? exces : messagesPonctuels(dragon, actionName),
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

// Une étape de quête : `resultatQuete` raconte ce qu'il vient de faire.
export async function repondreQuete(index) {
  const { dragon, applique, resultat } = await jouerChoixEtSauvegarder(index);
  return repondreDragon(dragon, { applique, resultatQuete: resultat });
}
