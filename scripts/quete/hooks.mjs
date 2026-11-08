// Permet à Node de charger le code du jeu tel que Next.js le lit : imports sans extension, JSON importé.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.(m?js|json)$/.test(specifier)) {
    const avecExtension = new URL(`${specifier}.js`, context.parentURL);
    if (existsSync(fileURLToPath(avecExtension))) return next(`${specifier}.js`, context);
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    const source = `export default ${await readFile(fileURLToPath(url), "utf8")}`;
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}
