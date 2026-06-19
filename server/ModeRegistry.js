// Loads every game mode and exposes lookup helpers.
import seedPhrase from "./modes/seedPhrase.js";
import breakupName from "./modes/breakupName.js";
import rugCoin from "./modes/rugCoin.js";
import confession from "./modes/confession.js";
import deadLanguage from "./modes/deadLanguage.js";
import wrongNumber from "./modes/wrongNumber.js";
import password from "./modes/password.js";
import oneHitWonder from "./modes/oneHitWonder.js";
import memeOrigin from "./modes/memeOrigin.js";
import coldCase from "./modes/coldCase.js";
import lastWill from "./modes/lastWill.js";

const MODES = [
  seedPhrase,
  breakupName,
  rugCoin,
  confession,
  deadLanguage,
  wrongNumber,
  password,
  oneHitWonder,
  memeOrigin,
  coldCase,
  lastWill,
];

const byId = new Map(MODES.map((m) => [m.id, m]));

export function getMode(id) {
  return byId.get(id) ?? MODES[0];
}

// Lightweight list for the lobby UI (no answers leaked).
export function listModes() {
  return MODES.map((m) => ({
    id: m.id,
    title: m.title,
    character: m.character,
    intro: m.intro,
  }));
}
