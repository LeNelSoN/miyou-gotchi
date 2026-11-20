// Lever et coucher du soleil, calculés sur place (formules simplifiées de la NOAA, précision de quelques
// minutes) : aucune requête, aucune position envoyée à un service. Tout se fait en UTC, donc le fuseau
// de l'appareil n'a pas d'importance.

// Lieu de la joueuse : Casablanca (cohérent avec `quete.fuseauHoraire` dans config/game.json).
export const LIEU = { latitude: 33.57, longitude: -7.59 };

const RAD = Math.PI / 180;
const MINUTES_JOUR = 1440;

// Minutes UTC depuis minuit du lever et du coucher du soleil, le jour de `date`.
export function leverCoucher(date, { latitude, longitude } = LIEU) {
  const debutAn = Date.UTC(date.getUTCFullYear(), 0, 1);
  const jour = Math.floor((date.getTime() - debutAn) / 86400000) + 1;
  const g = (2 * Math.PI / 365) * (jour - 1);
  const equation =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const declinaison =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  // Angle horaire au lever (soleil à 0,833° sous l'horizon : réfraction et rayon du disque).
  const cosAngle =
    Math.cos(90.833 * RAD) / (Math.cos(latitude * RAD) * Math.cos(declinaison)) -
    Math.tan(latitude * RAD) * Math.tan(declinaison);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) / RAD; // jour ou nuit polaire : borné
  return {
    lever: 720 - 4 * (longitude + angle) - equation,
    coucher: 720 - 4 * (longitude - angle) - equation,
  };
}

export function estNuit(date = new Date(), lieu = LIEU) {
  const { lever, coucher } = leverCoucher(date, lieu);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const modulo = (m) => ((m % MINUTES_JOUR) + MINUTES_JOUR) % MINUTES_JOUR;
  return modulo(minutes - lever) >= modulo(coucher - lever);
}
