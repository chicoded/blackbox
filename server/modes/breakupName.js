import { defineMode } from "./baseMode.js";

// Game 2 - "The One That Got Away". Guess the name, soft mask, fuzzy matching.
export default defineMode({
  id: "breakupName",
  title: "The One That Got Away",
  character: { name: "Heartbroken Guy", emoji: "💔" },
  intro:
    "A heartbroken guy texts: \"She left 3 years ago and I still can't say her name out loud. Can you guess who broke me?\"",
  maskStyle: "soft",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "vanessa",
      hint: "7 letters, ends in a sigh.",
      clues: [
        { type: "images", label: "Emoji story", payload: ["🎓", "☕", "🌧️", "💃", "💍", "❌"] },
        { type: "text", label: "Initials", payload: "V___ S___" },
        { type: "text", label: "Detail", payload: "A Scorpio. Of course." },
      ],
    },
    {
      answer: "jasmine",
      hint: "Shares a name with a flower.",
      clues: [
        { type: "images", label: "Emoji story", payload: ["🏖️", "🎶", "🌸", "✈️", "📞", "🚫"] },
        { type: "text", label: "Initials", payload: "J_____" },
        { type: "text", label: "Detail", payload: "Smelled like the tea she loved." },
      ],
    },
    {
      answer: "monica",
      hint: "A 90s sitcom had one.",
      clues: [
        { type: "images", label: "Emoji story", payload: ["🍝", "🛋️", "📺", "🎄", "💔", "📦"] },
        { type: "text", label: "Initials", payload: "M_____" },
        { type: "text", label: "Detail", payload: "Obsessively tidy. Left in a mess." },
      ],
    },
    {
      answer: "sofia",
      hint: "Means wisdom. The irony.",
      clues: [
        { type: "images", label: "Emoji story", payload: ["💃", "🍷", "🌃", "🎡", "📷", "👋"] },
        { type: "text", label: "Initials", payload: "S____" },
        { type: "text", label: "Detail", payload: "A capital city is named after her." },
      ],
    },
  ],
});
