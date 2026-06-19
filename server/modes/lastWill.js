import { defineMode } from "./baseMode.js";

// Game 11 - "The Last Will". Who (or what) inherits the fortune?
export default defineMode({
  id: "lastWill",
  title: "The Last Will",
  character: { name: "The Executor", emoji: "📜" },
  intro:
    "\"A billionaire left their entire fortune to ONE thing. The will is half-burned. Name the heir.\"",
  maskStyle: "soft",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "cat",
      hint: "Furry and unbothered (3).",
      clues: [
        { type: "images", label: "Burned will", payload: ["📜", "🔥", "🐈"] },
        { type: "text", label: "Relationship", payload: "“my only true companion”" },
        { type: "text", label: "The story", payload: "🏠 💰 ➡️ 🐈" },
      ],
    },
    {
      answer: "gardener",
      hint: "Tended the estate's roses (8).",
      clues: [
        { type: "images", label: "Burned will", payload: ["📜", "🌹", "🧑‍🌾"] },
        { type: "text", label: "Relationship", payload: "“the one who kept my garden alive”" },
        { type: "text", label: "The story", payload: "🌹 🏡 ❤️" },
      ],
    },
    {
      answer: "butler",
      hint: "Always answered the bell (6).",
      clues: [
        { type: "images", label: "Burned will", payload: ["📜", "🤵", "🔔"] },
        { type: "text", label: "Relationship", payload: "“more loyal than my own blood”" },
        { type: "text", label: "The story", payload: "🔔 🍷 🤵" },
      ],
    },
    {
      answer: "nephew",
      hint: "His brother's boy (6).",
      clues: [
        { type: "images", label: "Burned will", payload: ["📜", "👦", "💔"] },
        { type: "text", label: "Relationship", payload: "“the last of the family name”" },
        { type: "text", label: "The story", payload: "👨‍👦 💸 ⚖️" },
      ],
    },
  ],
});
