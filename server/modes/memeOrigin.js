import { defineMode } from "./baseMode.js";

// Game 9 - "The Meme Origin". Name the meme from cropped clues.
export default defineMode({
  id: "memeOrigin",
  title: "The Meme Origin",
  character: { name: "Lord of Lore", emoji: "🐸" },
  intro:
    "\"This meme is everywhere. But can you name the original? Prove your internet cred.\"",
  maskStyle: "symbol",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "doge",
      hint: "Such meme. Much shiba (4).",
      clues: [
        { type: "images", label: "Cropped meme", payload: ["🐕", "🟡", "💬"] },
        { type: "text", label: "Blew up", payload: "2013" },
        { type: "text", label: "Related", payload: "such wow, much cute, very coin" },
      ],
    },
    {
      answer: "rickroll",
      hint: "Never gonna give you up (8).",
      clues: [
        { type: "images", label: "Cropped meme", payload: ["🎤", "🕺", "🔗"] },
        { type: "text", label: "Blew up", payload: "2007" },
        { type: "text", label: "Related", payload: "a link that is NOT what you expect" },
      ],
    },
    {
      answer: "pepe",
      hint: "Feels good, man (4).",
      clues: [
        { type: "images", label: "Cropped meme", payload: ["🐸", "😢", "🎨"] },
        { type: "text", label: "Blew up", payload: "2015" },
        { type: "text", label: "Related", payload: "rare, sad, smug variants" },
      ],
    },
    {
      answer: "stonks",
      hint: "Number go up (6).",
      clues: [
        { type: "images", label: "Cropped meme", payload: ["📈", "🧑‍💼", "💸"] },
        { type: "text", label: "Blew up", payload: "2017" },
        { type: "text", label: "Related", payload: "Meme Man, misspelled on purpose" },
      ],
    },
  ],
});
