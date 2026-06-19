import { defineMode } from "./baseMode.js";

// Game 10 - "Cold Case Coordinates". Where was the postcard sent from?
export default defineMode({
  id: "coldCase",
  title: "Cold Case Coordinates",
  character: { name: "The Cartographer", emoji: "🗺️" },
  intro:
    "\"A postcard arrived with no return address. Three clues. Where on Earth was it sent from?\"",
  maskStyle: "soft",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "paris",
      hint: "The city of light (5).",
      clues: [
        { type: "images", label: "The photo", payload: ["🗼", "🥐", "🎨"] },
        { type: "text", label: "Local food", payload: "fresh croissants & escargot" },
        { type: "text", label: "Landmark", payload: "a famous iron tower" },
      ],
    },
    {
      answer: "tokyo",
      hint: "Neon and cherry blossoms (5).",
      clues: [
        { type: "images", label: "The photo", payload: ["🏯", "🍣", "🎌"] },
        { type: "text", label: "Local food", payload: "sushi & ramen" },
        { type: "text", label: "Landmark", payload: "Shibuya crossing" },
      ],
    },
    {
      answer: "egypt",
      hint: "Sand and pharaohs (5).",
      clues: [
        { type: "images", label: "The photo", payload: ["🏜️", "🐪", "🔺"] },
        { type: "text", label: "Local food", payload: "ful & falafel" },
        { type: "text", label: "Landmark", payload: "the Great Pyramids" },
      ],
    },
    {
      answer: "brazil",
      hint: "Football & carnival (6).",
      clues: [
        { type: "images", label: "The photo", payload: ["⚽", "🏖️", "🎭"] },
        { type: "text", label: "Local food", payload: "feijoada" },
        { type: "text", label: "Landmark", payload: "Christ the Redeemer" },
      ],
    },
  ],
});
