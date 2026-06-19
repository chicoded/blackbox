import { defineMode } from "./baseMode.js";

// Game 5 - "Dead Language". Translate the missing word on an ancient tablet.
export default defineMode({
  id: "deadLanguage",
  title: "Dead Language",
  character: { name: "Dr. Ash", emoji: "🏛️" },
  intro:
    "An archaeologist dusts off a tablet: \"This inscription has one symbol I can't translate. Fill the gap.\"",
  maskStyle: "symbol",
  matchMode: "exact",
  puzzles: [
    {
      answer: "water",
      hint: "Essential for life (5).",
      clues: [
        { type: "images", label: "The tablet", payload: ["📜", "🏺", "🌊"] },
        { type: "text", label: "The sentence", payload: "“Bring me ____ from the great river.”" },
        { type: "text", label: "Culture", payload: "Ancient Egypt, beside the Nile." },
      ],
    },
    {
      answer: "king",
      hint: "Sat on the throne (4).",
      clues: [
        { type: "images", label: "The tablet", payload: ["📜", "👑", "🏛️"] },
        { type: "text", label: "The sentence", payload: "“The ____ rules all the land.”" },
        { type: "text", label: "Culture", payload: "Mesopotamia." },
      ],
    },
    {
      answer: "sun",
      hint: "Rises in the east (3).",
      clues: [
        { type: "images", label: "The tablet", payload: ["📜", "☀️", "🔺"] },
        { type: "text", label: "The sentence", payload: "“The ____ god watches over us.”" },
        { type: "text", label: "Culture", payload: "Egyptian mythology — Ra." },
      ],
    },
    {
      answer: "war",
      hint: "The opposite of peace (3).",
      clues: [
        { type: "images", label: "The tablet", payload: ["📜", "⚔️", "🛡️"] },
        { type: "text", label: "The sentence", payload: "“They marched to ____ at dawn.”" },
        { type: "text", label: "Culture", payload: "Ancient Sparta." },
      ],
    },
  ],
});
