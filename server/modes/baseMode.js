// The contract every game mode follows. The RoundEngine only ever talks to
// modes through this shape, so adding a new game = adding one file in modes/.
import { normalize, levenshtein, pick } from "../util/text.js";

// Build a mode from a config object + a pool of puzzles.
// puzzle shape: { answer, hint, clues: [{ type, payload, label }] }
//   clue types: "images" (array of emoji/urls) | "word" | "text"
export function defineMode(config) {
  const {
    id,
    title,
    character, // { name, emoji }
    intro,
    maskStyle = "symbol", // "symbol" | "soft" | "caps"
    matchMode = "exact", // "exact" | "fuzzy"
    puzzles = [],
  } = config;

  return {
    id,
    title,
    character,
    intro,
    maskStyle,

    // Pick a fresh puzzle, avoiding the ones already used this game.
    createRound(usedAnswers = []) {
      const available = puzzles.filter((p) => !usedAnswers.includes(p.answer));
      const puzzle = pick(available.length ? available : puzzles);
      return {
        answer: puzzle.answer,
        hint: puzzle.hint ?? "",
        clues: puzzle.clues ?? [],
      };
    },

    // Is the guess correct? Fuzzy modes tolerate a typo.
    checkGuess(guess, answer) {
      if (matchMode === "fuzzy") {
        const tolerance = answer.length >= 6 ? 2 : 1;
        return levenshtein(guess, answer) <= tolerance;
      }
      return normalize(guess) === normalize(answer);
    },
  };
}
