import { defineMode } from "./baseMode.js";

// Game 8 - "One-Hit Wonder". Name the song that defined a summer.
export default defineMode({
  id: "oneHitWonder",
  title: "One-Hit Wonder",
  character: { name: "DJ Echo", emoji: "🎵" },
  intro:
    "\"This song defined a summer, then the artist vanished. Name the track.\"",
  maskStyle: "symbol",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "macarena",
      hint: "A whole dance came with it (8).",
      clues: [
        { type: "images", label: "Vibe", payload: ["💿", "💃", "🕺"] },
        { type: "text", label: "Lyric", payload: "“Heeey ______ … AY!”" },
        { type: "text", label: "Era", payload: "1996 · Latin pop" },
      ],
    },
    {
      answer: "gangnam",
      hint: "____ Style (7).",
      clues: [
        { type: "images", label: "Vibe", payload: ["🐴", "🕶️", "🇰🇷"] },
        { type: "text", label: "Lyric", payload: "“Oppa ______ style”" },
        { type: "text", label: "Era", payload: "2012 · K-pop" },
      ],
    },
    {
      answer: "tequila",
      hint: "The lyric is basically one word (7).",
      clues: [
        { type: "images", label: "Vibe", payload: ["🍸", "🎺", "💃"] },
        { type: "text", label: "Lyric", payload: "(saxophone)… “______!”" },
        { type: "text", label: "Era", payload: "1958 · Rock & roll" },
      ],
    },
    {
      answer: "mambo",
      hint: "“A little bit of…” (5).",
      clues: [
        { type: "images", label: "Vibe", payload: ["🎺", "💃", "🔢"] },
        { type: "text", label: "Lyric", payload: "“A little bit of Monica… ______ No. 5”" },
        { type: "text", label: "Era", payload: "1999 · Latin pop" },
      ],
    },
  ],
});
