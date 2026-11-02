// Petits sons façon tamagotchi, générés par le navigateur (Web Audio) : aucun fichier à charger.
// Chaque son est une suite de notes `[fréquence en Hz, durée en ms]` ; 0 = silence.

const CLE_SON = "miyou-gotchi:son";
const EVENEMENT_SON = "miyou-gotchi:son";
const VOLUME = 0.06;

// Notes utiles (Hz).
const DO5 = 523, MI5 = 659, SOL5 = 784;
const DO6 = 1047, RE6 = 1175, MI6 = 1319, FA6 = 1397, SOL6 = 1568;

const SONS = {
  // Appui sur un bouton de la coque.
  bip: [[1200, 40]],
  // Soin réussi : petit arpège montant.
  soin: [[DO6, 70], [MI6, 70], [SOL6, 110]],
  // Leçon de sport ou de lecture.
  lecon: [[SOL5, 80], [DO6, 80], [MI6, 80], [DO6, 140]],
  // Leçon de musique : une petite ritournelle.
  musique: [[DO6, 120], [MI6, 120], [SOL6, 120], [MI6, 120], [FA6, 120], [RE6, 120], [DO6, 240]],
  // Soin refusé (bouton grisé côté serveur, réveil trop tôt...).
  refus: [[330, 90], [0, 30], [220, 160]],
  // Le dragon musicien fredonne quand ses notes flottent autour de lui.
  fredonne: [[MI5, 160], [SOL5, 160], [MI5, 240]],
  // Coucher : berceuse descendante.
  dodo: [[SOL5, 220], [MI5, 220], [DO5, 420]],
  // Réveil : réveil montant et joyeux.
  reveil: [[DO5, 90], [MI5, 90], [SOL5, 90], [DO6, 220]],
  // Éclosion et passage d'étape : petite fanfare.
  fanfare: [[DO6, 100], [MI6, 100], [SOL6, 100], [0, 60], [MI6, 100], [SOL6, 320]],
};

let contexte = null;

export function sonActive() {
  try {
    return localStorage.getItem(CLE_SON) !== "coupe";
  } catch {
    return true;
  }
}

export function basculerSon() {
  try {
    localStorage.setItem(CLE_SON, sonActive() ? "coupe" : "actif");
  } catch {
    // Stockage indisponible : le réglage ne sera pas retenu.
  }
  window.dispatchEvent(new Event(EVENEMENT_SON));
}

// Pour `useSyncExternalStore` : prévient les composants quand le son est coupé ou remis.
export function abonnerSon(rappel) {
  window.addEventListener(EVENEMENT_SON, rappel);
  return () => window.removeEventListener(EVENEMENT_SON, rappel);
}

// Les navigateurs (iPhone surtout) n'autorisent le son qu'après un geste : le contexte est créé ou
// relancé au premier appui, puis les sons joués après une réponse du serveur passent aussi.
function contexteAudio() {
  const Contexte = window.AudioContext ?? window.webkitAudioContext;
  if (!Contexte) return null;
  contexte ??= new Contexte();
  if (contexte.state === "suspended") contexte.resume();
  return contexte;
}

export function jouerSon(nom) {
  const notes = SONS[nom];
  if (!notes || !sonActive()) return;
  const audio = contexteAudio();
  if (!audio) return;

  let debut = audio.currentTime + 0.01;
  for (const [frequence, dureeMs] of notes) {
    const duree = dureeMs / 1000;
    if (frequence > 0) {
      const oscillateur = audio.createOscillator();
      const volume = audio.createGain();
      oscillateur.type = "square";
      oscillateur.frequency.value = frequence;
      // Attaque et relâche très courtes : pas de « clic » entre deux notes.
      volume.gain.setValueAtTime(0, debut);
      volume.gain.linearRampToValueAtTime(VOLUME, debut + 0.005);
      volume.gain.setValueAtTime(VOLUME, debut + duree - 0.015);
      volume.gain.linearRampToValueAtTime(0, debut + duree);
      oscillateur.connect(volume).connect(audio.destination);
      oscillateur.start(debut);
      oscillateur.stop(debut + duree);
    }
    debut += duree;
  }
}
