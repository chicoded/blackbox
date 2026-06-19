import { defineMode } from "./baseMode.js";

// Game 4 - "The Confession" (whodunit). Guess the murder weapon.
export default defineMode({
  id: "confession",
  title: "The Confession",
  character: { name: "Detective Vex", emoji: "🕵️" },
  intro:
    "A detective leans in: \"Five suspects. One killer. The murder weapon is missing from my notes. Help me name it.\"",
  maskStyle: "symbol",
  matchMode: "exact",
  puzzles: [
    {
      answer: "candlestick",
      hint: "A Clue board classic.",
      clues: [
        { type: "images", label: "Crime scene", payload: ["🕯️", "🩸", "🏛️"] },
        { type: "text", label: "Alibi", payload: "Found in the library, the wax still warm." },
        { type: "text", label: "Witness", payload: "Heavy, golden, and very swingable." },
      ],
    },
    {
      answer: "poison",
      hint: "No fingerprints, no struggle.",
      clues: [
        { type: "images", label: "Crime scene", payload: ["🧪", "🍷", "💀"] },
        { type: "text", label: "Alibi", payload: "The wine glass had a strange residue." },
        { type: "text", label: "Witness", payload: "The butler studied chemistry." },
      ],
    },
    {
      answer: "wrench",
      hint: "From the garage.",
      clues: [
        { type: "images", label: "Crime scene", payload: ["🔧", "🔩", "🚗"] },
        { type: "text", label: "Alibi", payload: "Grease marks led to the workshop." },
        { type: "text", label: "Witness", payload: "Mechanic was the last one seen." },
      ],
    },
    {
      answer: "dagger",
      hint: "Short, sharp, silent.",
      clues: [
        { type: "images", label: "Crime scene", payload: ["🗡️", "🩸", "🧥"] },
        { type: "text", label: "Alibi", payload: "A torn coat caught on the blade." },
        { type: "text", label: "Witness", payload: "An antique from the study wall." },
      ],
    },
  ],
});
