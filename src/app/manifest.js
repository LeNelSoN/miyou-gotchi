// Rend le jeu installable sur l'écran d'accueil, condition des notifications sur iPhone et iPad.
export default function manifest() {
  return {
    name: "Miyou-Gotchi",
    short_name: "Miyou-Gotchi",
    description: "Un dragon virtuel à faire grandir",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
