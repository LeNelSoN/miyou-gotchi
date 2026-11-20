#!/usr/bin/env python3
"""Génère le décor pixel art de l'écran (script ponctuel, hors dépendances du projet).

Pillow n'est PAS une dépendance du projet : ~/.venvs/visuel/bin/python scripts/generer-fond.py

Sortie : public/fond/ecran-jour.png et ecran-nuit.png, 96 x 110 pixels de GIF (la grande scène de Illustration.js), affichée à l'échelle
des dragons, alignée en bas, répétée en largeur. Ciel en paliers tramés (teintes de l'écran LCD), deux rangées de
montagnes dont un volcan, sol d'herbe et de terre où se posent les pieds. Tout est calculé ici (graine fixe).
"""
import math
import random
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "public" / "fond"
L, H = 96, 110
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
SOL_H = 14  # hauteur du sol ; les pieds sont posés dans la bande d'herbe, tout en bas


def hexa(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


# Palettes : ciel (haut -> horizon), montagnes lointaines / proches, volcan (ombre, lumière), herbe (bord, corps, ombre),
# terre (claire, foncée), points de terre. Le premier ton du ciel sert de couleur de repli au-dessus de l'image.
PALETTES = {
    "jour": dict(ciel=("#dfe8c4", "#d6e3bb", "#cdddb3", "#c3d6aa", "#b9ce9f"), loin="#a4bd8e", pres="#8da878",
                 volcan=("#7f9c6c", "#729063"), herbe=("#a9c46b", "#7fa24f", "#5f8340"), terre=("#9a8656", "#8a774a"),
                 point="#6e5d38", nuage=("#f1f5e0", "#e4ecd0"), fumee="#cbd6b6"),
    "nuit": dict(ciel=("#0a1721", "#0f2430", "#16363e", "#1f4a48", "#2b5f50"), loin="#1b3a3a", pres="#142c2d",
                 volcan=("#10272a", "#0c2022"), herbe=("#44704c", "#325a41", "#264734"), terre=("#2d3a2c", "#263326"),
                 point="#162016", nuage=None, fumee="#4f6a68"),
}


def main(nom):
    pal = PALETTES[nom]
    CIEL = [hexa(c) for c in pal["ciel"]]
    alea = random.Random(5)
    im = Image.new("RGBA", (L, H))
    px = im.load()
    n = len(CIEL) - 1
    # ciel : du plus clair en haut au plus soutenu à l'horizon
    for y in range(H - SOL_H):
        v = y / (H - SOL_H) * n
        base = int(v)
        t = 0.0 if v - base < 0.5 else (v - base - 0.5) / 0.5
        for x in range(L):
            px[x, y] = CIEL[min(base + (1 if t > (BAYER[y % 4][x % 4] + 0.5) / 16 else 0), n)]
    # nuages
    if nom == "nuit":  # étoiles et petite lune
        for _ in range(26):
            x, y = alea.randrange(L), alea.randrange(0, 60)
            px[x, y] = hexa("#e9f1dc" if alea.random() > 0.6 else "#6f9a93")
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                if dx * dx + dy * dy <= 10 and (dx + 2) ** 2 + (dy - 1) ** 2 > 7:
                    px[74 + dx, 18 + dy] = hexa("#f1ecc9")
    for cx, cy, w in (((20, 16, 18), (74, 30, 22)) if pal["nuage"] else ()):
        for dy in range(-2, 3):
            demi = int(w / 2 * (1 - abs(dy) / 3))
            for dx in range(-demi, demi + 1):
                px[(cx + dx) % L, cy + dy] = hexa(pal["nuage"][dy >= 2])
    horizon = H - SOL_H
    # montagnes lointaines (pâles) puis proches (plus sombres) ; le pic du fond est un volcan fumant
    for x in range(L):
        loin = int(18 + 10 * math.sin(2 * math.pi * (x + 12) / 64) + 5 * math.sin(2 * math.pi * x / 23))
        for y in range(horizon - loin, horizon):
            px[x, y] = hexa(pal["loin"])
    for x in range(L):
        pres = int(8 + 6 * math.sin(2 * math.pi * (x + 40) / 48))
        for y in range(horizon - pres, horizon):
            px[x, y] = hexa(pal["pres"])
    vx, vh = 30, 34  # volcan : cône à pente de 1 px par colonne, cratère tronqué
    for dx in range(-vh, vh + 1):
        haut = horizon - (vh - abs(dx))
        haut = max(haut, horizon - vh + 3)
        for y in range(haut, horizon):
            px[(vx + dx) % L, y] = hexa(pal["volcan"][dx >= 0])
    for dx in range(-3, 4):  # braise au cratère et fumée
        px[vx + dx, horizon - vh + 3] = hexa("#e08a3c")
    for k, (dx, dy) in enumerate(((0, 5), (1, 8), (-1, 11), (1, 15), (0, 19))):
        for ex in range(2 + k // 2):
            px[(vx + dx + ex) % L, horizon - vh - dy] = hexa(pal["fumee"])
    # sol : herbe au bord irrégulier, puis terre tramée, quelques cailloux et brins
    bord, h = [], 0
    for x in range(L):
        if alea.random() < 0.2:
            h += alea.choice([-1, 1])
        h = max(-1, min(1, h))
        bord.append(h)
    for i in range(10):  # raccord des deux extrémités pour que la tuile se répète sans couture
        t = i / 10
        bord[L - 10 + i] = round(bord[L - 10 + i] * (1 - t) + bord[0] * t)
    for x in range(L):
        e = horizon + bord[x]
        for y in range(e, H):
            d = y - e
            if d < 1:
                c = pal["herbe"][0]
            elif d < 5:
                c = pal["herbe"][1]
            elif d < 7:
                c = pal["herbe"][2] if BAYER[y % 4][x % 4] < (7 - d) * 5 else pal["terre"][0]
            else:
                c = pal["terre"][0] if d < 9 else pal["terre"][1]
            px[x, y] = hexa(c)
        if alea.random() < 0.1:
            px[x, e - 1] = hexa(pal["herbe"][1])
    for _ in range(14):
        px[alea.randrange(L), alea.randrange(horizon + 8, H)] = hexa(pal["point"])
    chemin = SORTIE / f"ecran-{nom}.png"
    im.save(chemin, optimize=True)
    chemin.chmod(0o644)
    print(f"{chemin.relative_to(RACINE)} : {L} x {H} px")


if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    for nom in PALETTES:
        main(nom)
