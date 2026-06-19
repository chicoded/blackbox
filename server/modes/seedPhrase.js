import { defineMode } from "./baseMode.js";

// Game 1 - "The Seed Phrase". Masked common word, clues = 4 pics + word + hint.
export default defineMode({
  id: "seedPhrase",
  title: "The Seed Phrase",
  character: { name: "0xGhost", emoji: "👾" },
  intro:
    "A glitchy hacker pops into chat: \"I lost ONE word from my 12-word recovery phrase. Help me find it before the wallet locks forever.\"",
  maskStyle: "symbol",
  matchMode: "exact",
  puzzles: [
    {
      answer: "selfish",
      hint: "Opposite of generous (7 letters)",
      clues: [
        { type: "images", label: "4 Pics", payload: ["🪞", "🤑", "🫳", "🥇"] },
        { type: "word", label: "Related word", payload: "greedy" },
        { type: "text", label: "Hint", payload: "Thinks only of number one." },
      ],
    },
    {
      answer: "freedom",
      hint: "What every prisoner dreams of (7 letters)",
      clues: [
        { type: "images", label: "4 Pics", payload: ["🕊️", "⛓️", "🗽", "🦅"] },
        { type: "word", label: "Related word", payload: "liberty" },
        { type: "text", label: "Hint", payload: "Braveheart screamed it." },
      ],
    },
    {
      answer: "diamond",
      hint: "Hardest natural material (7 letters)",
      clues: [
        { type: "images", label: "4 Pics", payload: ["💎", "💍", "⛏️", "🙌"] },
        { type: "word", label: "Related word", payload: "hands" },
        { type: "text", label: "Hint", payload: "HODL with these hands." },
      ],
    },
    {
      answer: "thunder",
      hint: "Follows lightning (7 letters)",
      clues: [
        { type: "images", label: "4 Pics", payload: ["⚡", "🌩️", "🥁", "🐶"] },
        { type: "word", label: "Related word", payload: "storm" },
        { type: "text", label: "Hint", payload: "You hear it after you see the flash." },
      ],
    },
    {
      answer: "rocket",
      hint: "Goes to the moon (6 letters)",
      clues: [
        { type: "images", label: "4 Pics", payload: ["🚀", "🌕", "🔥", "📈"] },
        { type: "word", label: "Related word", payload: "launch" },
        { type: "text", label: "Hint", payload: "What every coin promises to do." },
      ],
    },
  ],
});
