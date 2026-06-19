import { defineMode } from "./baseMode.js";

// Game 7 - "The Password" (hacker heist). Crack the final password fragment.
export default defineMode({
  id: "password",
  title: "The Password",
  character: { name: "The Crew", emoji: "💻" },
  intro:
    "\"We're 30 seconds from cracking the vault. The last password is scrambled. GUESS IT, FAST.\"",
  maskStyle: "symbol",
  matchMode: "exact",
  puzzles: [
    {
      answer: "dragon",
      hint: "Mythical beast, very common password (6).",
      clues: [
        { type: "images", label: "On screen", payload: ["💻", "🔥", "🐉"] },
        { type: "text", label: "Security question", payload: "“Favorite mythical creature?”" },
        { type: "text", label: "Keyboard smudges", payload: "D · R · A · G · O · N" },
      ],
    },
    {
      answer: "letmein",
      hint: "What you beg at a locked door (7).",
      clues: [
        { type: "images", label: "On screen", payload: ["🚪", "🙏", "💻"] },
        { type: "text", label: "Sticky note", payload: "“the polite request”" },
        { type: "text", label: "Keyboard smudges", payload: "L E T M I N" },
      ],
    },
    {
      answer: "sunshine",
      hint: "Cheerful weather (8).",
      clues: [
        { type: "images", label: "On screen", payload: ["☀️", "😎", "🌻"] },
        { type: "text", label: "Security question", payload: "“Favorite kind of day?”" },
        { type: "text", label: "Keyboard smudges", payload: "S U N H I E" },
      ],
    },
    {
      answer: "password",
      hint: "Ironically the worst choice (8).",
      clues: [
        { type: "images", label: "On screen", payload: ["📝", "🔓", "🤦"] },
        { type: "text", label: "Sticky note", payload: "“just the obvious one”" },
        { type: "text", label: "Keyboard smudges", payload: "everywhere… all keys worn" },
      ],
    },
  ],
});
